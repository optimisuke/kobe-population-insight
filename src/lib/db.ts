import { connect } from "@tidbcloud/serverless";

let _conn: ReturnType<typeof connect> | null = null;

export function getDb() {
  if (!_conn) {
    const { TIDB_HOST, TIDB_USER, TIDB_PASSWORD, TIDB_PORT, TIDB_DATABASE } =
      process.env;
    const url = `mysql://${TIDB_USER}:${TIDB_PASSWORD}@${TIDB_HOST}:${TIDB_PORT ?? 4000}/${TIDB_DATABASE ?? "kobe_population"}?ssl=true`;
    _conn = connect({ url });
  }
  return _conn;
}
