/**
 * 神戸市人口CSVをパースしてTiDB Cloud の population テーブルに投入する
 *
 * Shift-JIS でエンコードされたCSVを iconv-lite で変換してから処理する。
 * 各行を population テーブルの (year, ward, age_group, metric, value) に正規化する。
 *
 * 実行前にデータをダウンロードしておくこと:
 *   npx tsx scripts/etl/fetch-population.ts
 */

import { connect } from "@tidbcloud/serverless";
import { readFileSync, readdirSync } from "fs";
import { join, basename } from "path";
import iconv from "iconv-lite";
import "dotenv/config";

const DATA_DIR = join(process.cwd(), "data", "population");

// 年齢グループへの正規化（0〜100以上 → 0-4, 5-9, ..., 20-29, ..., 65+）
function normalizeAgeGroup(age: number): string {
  if (age >= 100) return "100+";
  if (age >= 65) return "65+";
  const low = Math.floor(age / 10) * 10;
  const high = low + 9;
  return `${low}-${high}`;
}

type Row = {
  year: number;
  ward: string | null;
  age_group: string;
  metric: string;
  value: number;
};

function decodeCsv(filePath: string): string[][] {
  const buf = readFileSync(filePath);
  // Shift-JIS 試行 → 失敗なら UTF-8 フォールバック
  const text = iconv.encodingExists("Shift_JIS")
    ? iconv.decode(buf, "Shift_JIS")
    : buf.toString("utf-8");

  return text
    .split(/\r?\n/)
    .filter((l) => l.trim())
    .map((l) => l.split(",").map((c) => c.trim().replace(/^"|"$/g, "")));
}

/**
 * eurf350001 / eurf351001 形式: 年月,区,分類,性別,年齢,件数
 * ヘッダー行はスキップして、6列のデータ行を処理する
 */
function parseTransferCsv(
  lines: string[][],
  metric: "transfer_in" | "transfer_out",
  year: number
): Row[] {
  const rows: Row[] = [];
  for (const cols of lines) {
    if (cols.length < 6) continue;
    const ym = cols[0];
    if (!/^\d{6}$/.test(ym)) continue; // ヘッダー行スキップ
    const rowYear = parseInt(ym.substring(0, 4));
    if (rowYear !== year) continue;

    const ward = cols[1] || null;
    const ageRaw = cols[4];
    const valueRaw = cols[5];
    const ageNum = parseInt(ageRaw);
    const value = parseInt(valueRaw);
    if (isNaN(ageNum) || isNaN(value)) continue;

    rows.push({
      year,
      ward,
      age_group: normalizeAgeGroup(ageNum),
      metric,
      value,
    });
  }
  return aggregateRows(rows);
}

/**
 * eurf310005 形式: 年月,区,分類,性別,年齢,人口数
 */
function parsePopulationCsv(lines: string[][], year: number): Row[] {
  const rows: Row[] = [];
  for (const cols of lines) {
    if (cols.length < 6) continue;
    const ym = cols[0];
    if (!/^\d{6}$/.test(ym)) continue;
    const rowYear = parseInt(ym.substring(0, 4));
    const rowMonth = parseInt(ym.substring(4));
    // 1月のみ採用（年次スナップショット）
    if (rowYear !== year || rowMonth !== 1) continue;

    const ward = cols[1] || null;
    const ageNum = parseInt(cols[4]);
    const value = parseInt(cols[5]);
    if (isNaN(ageNum) || isNaN(value)) continue;

    rows.push({
      year,
      ward,
      age_group: normalizeAgeGroup(ageNum),
      metric: "population",
      value,
    });
  }
  return aggregateRows(rows);
}

/**
 * 将来推計CSV: 年,区,性別,年齢,人口
 */
function parseProjectionCsv(lines: string[][], byWard: boolean): Row[] {
  const rows: Row[] = [];
  for (const cols of lines) {
    if (cols.length < 4) continue;
    const yearRaw = cols[0];
    if (!/^\d{4}$/.test(yearRaw)) continue;
    const projYear = parseInt(yearRaw);
    const ward = byWard ? cols[1] : null;
    const ageCol = byWard ? 3 : 2;
    const valCol = byWard ? 4 : 3;
    const ageNum = parseInt(cols[ageCol]);
    const value = parseInt(cols[valCol]);
    if (isNaN(ageNum) || isNaN(value)) continue;

    rows.push({
      year: projYear,
      ward,
      age_group: normalizeAgeGroup(ageNum),
      metric: "projection",
      value,
    });
  }
  return aggregateRows(rows);
}

// 同一 (year, ward, age_group, metric) のvalueを合算
function aggregateRows(rows: Row[]): Row[] {
  const map = new Map<string, Row>();
  for (const r of rows) {
    const key = `${r.year}|${r.ward}|${r.age_group}|${r.metric}`;
    const existing = map.get(key);
    if (existing) {
      existing.value += r.value;
    } else {
      map.set(key, { ...r });
    }
  }
  return [...map.values()];
}

async function bulkInsert(
  conn: ReturnType<typeof connect>,
  rows: Row[]
): Promise<void> {
  if (rows.length === 0) return;
  const CHUNK = 500;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const placeholders = chunk.map(() => "(?,?,?,?,?)").join(",");
    const values = chunk.flatMap((r) => [
      r.year,
      r.ward,
      r.age_group,
      r.metric,
      r.value,
    ]);
    await conn.execute(
      `INSERT INTO population (year, ward, age_group, metric, value) VALUES ${placeholders}`,
      values
    );
  }
}

async function main() {
  const conn = connect({
    host: process.env.TIDB_HOST!,
    port: Number(process.env.TIDB_PORT ?? 4000),
    user: process.env.TIDB_USER!,
    password: process.env.TIDB_PASSWORD!,
    database: process.env.TIDB_DATABASE,
    ssl: { minVersion: "TLSv1.2" },
  });

  // クリア（再実行用）
  console.log("population テーブルをクリア中...");
  await conn.execute("DELETE FROM population");

  const files = readdirSync(DATA_DIR).sort();
  let totalRows = 0;

  for (const file of files) {
    const path = join(DATA_DIR, file);
    const name = basename(file, ".csv");
    console.log(`処理中: ${file}`);

    const lines = decodeCsv(path);
    let rows: Row[] = [];

    const yearMatch = name.match(/^(\d{4})-/);
    const year = yearMatch ? parseInt(yearMatch[1]) : 0;

    if (name.includes("transfer-in")) {
      rows = parseTransferCsv(lines, "transfer_in", year);
    } else if (name.includes("transfer-out")) {
      rows = parseTransferCsv(lines, "transfer_out", year);
    } else if (name.includes("age-population")) {
      rows = parsePopulationCsv(lines, year);
    } else if (name.includes("projection-ward")) {
      rows = parseProjectionCsv(lines, true);
    } else if (name.includes("projection-city")) {
      rows = parseProjectionCsv(lines, false);
    } else {
      console.log(`  スキップ（未知の形式）`);
      continue;
    }

    await bulkInsert(conn, rows);
    console.log(`  → ${rows.length} 行挿入`);
    totalRows += rows.length;
  }

  console.log(`\n完了: 計 ${totalRows} 行挿入`);
}

main().catch(console.error);
