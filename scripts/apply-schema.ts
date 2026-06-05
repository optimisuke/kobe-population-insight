import { connect } from "@tidbcloud/serverless";
import { readFileSync } from "fs";
import { join } from "path";
import "dotenv/config";

async function main() {
  const conn = connect({
    host: process.env.TIDB_HOST!,
    port: Number(process.env.TIDB_PORT ?? 4000),
    user: process.env.TIDB_USER!,
    password: process.env.TIDB_PASSWORD!,
    database: process.env.TIDB_DATABASE,
    ssl: { minVersion: "TLSv1.2" },
  });

  const sql = readFileSync(join(__dirname, "schema.sql"), "utf-8");
  const statements = sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"));

  for (const stmt of statements) {
    console.log(`実行: ${stmt.substring(0, 60)}...`);
    await conn.execute(stmt);
  }

  console.log("スキーマ適用完了");
}

main().catch(console.error);
