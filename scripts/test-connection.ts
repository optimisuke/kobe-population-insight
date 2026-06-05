import { connect } from "@tidbcloud/serverless";
import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  console.log("接続先:", process.env.TIDB_HOST);
  const { TIDB_HOST, TIDB_USER, TIDB_PASSWORD, TIDB_PORT } = process.env;
  const url = `mysql://${TIDB_USER}:${TIDB_PASSWORD}@${TIDB_HOST}:${TIDB_PORT ?? 4000}/test?ssl=true`;
  const conn = connect({ url });
  const result = await conn.execute("SELECT version() AS v", [], {
    fullResult: true,
  });
  console.log("接続成功 ✓");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  console.log("TiDB バージョン:", ((result.rows ?? []) as any)[0]?.v);
}

main().catch((e) => {
  console.error("接続失敗:", e.message);
  process.exit(1);
});
