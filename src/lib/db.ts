import { connect } from "@tidbcloud/serverless";

let _conn: ReturnType<typeof connect> | null = null;

export function getDb() {
  if (!_conn) {
    _conn = connect({
      host: process.env.TIDB_HOST!,
      port: Number(process.env.TIDB_PORT ?? 4000),
      user: process.env.TIDB_USER!,
      password: process.env.TIDB_PASSWORD!,
      database: process.env.TIDB_DATABASE,
      ssl: { minVersion: "TLSv1.2" },
    });
  }
  return _conn;
}
