/**
 * 神戸市の政策文書PDFをダウンロードする
 *
 * 対象:
 *   - 神戸市総合基本計画（第6次）日本語版
 *   - 神戸市人口ビジョン（将来人口推計解説）
 *   - 神戸2030ビジョン 第1〜3回配布資料
 */

import { createWriteStream, mkdirSync } from "fs";
import { pipeline } from "stream/promises";
import { join } from "path";

const DATA_DIR = join(process.cwd(), "data", "policy");
const BASE = "https://www.city.kobe.lg.jp";

const TARGETS = [
  {
    url: `${BASE}/documents/64004/thesixthkobecitymasterplan.pdf`,
    file: "kobe-master-plan-6th.pdf",
    label: "神戸市総合基本計画（第6次）",
    title: "第6次神戸市総合基本計画",
    sourceUrl: `${BASE}/a47946/sougoukihonkeikaku.html`,
  },
  {
    url: `${BASE}/documents/78938/suikei_2025.pdf`,
    file: "kobe-population-projection-method-2025.pdf",
    label: "神戸市将来人口推計方法（2025年版）",
    title: "神戸市将来人口推計2025",
    sourceUrl: `${BASE}/a47946/kobesyoraisuikei.html`,
  },
  {
    url: `${BASE}/documents/82133/siryou1.pdf`,
    file: "kobe-2030-vision-vol1.pdf",
    label: "神戸2030ビジョン 第1回配布資料",
    title: "神戸2030ビジョン策定検討委員会 第1回資料",
    sourceUrl: `${BASE}/a47946/shise/kekaku/masterplan/jikikihonkeikaku00/2030visioinsuishin.html`,
  },
  {
    url: `${BASE}/documents/82133/siryou.pdf`,
    file: "kobe-2030-vision-vol2.pdf",
    label: "神戸2030ビジョン 第2回配布資料",
    title: "神戸2030ビジョン策定検討委員会 第2回資料",
    sourceUrl: `${BASE}/a47946/shise/kekaku/masterplan/jikikihonkeikaku00/2030visioinsuishin.html`,
  },
  {
    url: `${BASE}/documents/82133/20260303143000.pdf`,
    file: "kobe-2030-vision-vol3.pdf",
    label: "神戸2030ビジョン 第3回配布資料",
    title: "神戸2030ビジョン策定検討委員会 第3回資料",
    sourceUrl: `${BASE}/a47946/shise/kekaku/masterplan/jikikihonkeikaku00/2030visioinsuishin.html`,
  },
];

async function download(
  url: string,
  dest: string,
  label: string
): Promise<boolean> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; research-bot/1.0)" },
  });
  if (!res.ok) {
    console.warn(`スキップ: ${label} (HTTP ${res.status})`);
    return false;
  }
  const out = createWriteStream(dest);
  await pipeline(res.body as unknown as NodeJS.ReadableStream, out);
  const bytes = (await import("fs")).statSync(dest).size;
  console.log(`✓ ${label} → ${dest} (${(bytes / 1024).toFixed(0)} KB)`);
  return true;
}

async function main() {
  mkdirSync(DATA_DIR, { recursive: true });

  // メタ情報をJSONで保存（import-policies.ts が参照する）
  const meta = TARGETS.map(({ file, title, sourceUrl }) => ({
    file,
    title,
    sourceUrl,
  }));
  const { writeFileSync } = await import("fs");
  writeFileSync(
    join(DATA_DIR, "meta.json"),
    JSON.stringify(meta, null, 2),
    "utf-8"
  );

  let ok = 0;
  let skip = 0;
  for (const t of TARGETS) {
    const dest = join(DATA_DIR, t.file);
    const success = await download(t.url, join(DATA_DIR, t.file), t.label);
    success ? ok++ : skip++;
  }

  console.log(`\n完了: ${ok} ファイル取得, ${skip} ファイルスキップ`);
}

main().catch(console.error);
