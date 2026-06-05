import { connect } from "@tidbcloud/serverless";
import { readFileSync } from "fs";
import { join } from "path";
import { config } from "dotenv"; config({ path: ".env.local" });

async function main() {
  const { TIDB_HOST, TIDB_USER, TIDB_PASSWORD, TIDB_PORT } = process.env;
  const base = `mysql://${TIDB_USER}:${TIDB_PASSWORD}@${TIDB_HOST}:${TIDB_PORT ?? 4000}`;

  // Step1: DB作成（データベース名なしで接続）
  const connBase = connect({ url: `${base}/?ssl=true` });
  console.log("データベース作成中...");
  await connBase.execute(
    "CREATE DATABASE IF NOT EXISTS kobe_population CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
  );
  console.log("✓ kobe_population データベース作成完了");

  // Step2: テーブル作成（データベース名付きで再接続）
  const conn = connect({ url: `${base}/kobe_population?ssl=true` });
  const sql = readFileSync(join(__dirname, "schema.sql"), "utf-8");
  // コメント行を除去してから判定する
  const stripComments = (s: string) =>
    s
      .split("\n")
      .filter((l) => !l.trim().startsWith("--"))
      .join("\n")
      .trim();

  const statements = sql
    .split(";")
    .map((s) => stripComments(s))
    .filter((s) => {
      if (!s) return false;
      const up = s.toUpperCase();
      return !up.startsWith("CREATE DATABASE") && !up.startsWith("USE");
    });

  for (const stmt of statements) {
    console.log(`実行: ${stmt.substring(0, 60)}...`);
    await conn.execute(stmt);
  }

  console.log("✓ スキーマ適用完了");
}

main().catch(console.error);
