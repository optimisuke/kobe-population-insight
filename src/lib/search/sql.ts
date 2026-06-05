/**
 * SQL検索: AIが質問からパラメータを抽出し、固定テンプレートクエリを実行する。
 * AIに直接SQL文字列を生成させないことでインジェクションを防ぐ。
 */

import { getDb } from "../db";
import { getOpenAI } from "../openai";

export type SqlSearchParams = {
  metric: "population" | "transfer_in" | "transfer_out" | "projection" | null;
  year: number | null;
  ward: string | null;
  ageGroup: string | null;
};

export type SqlSearchResult = {
  rows: Record<string, unknown>[];
  params: SqlSearchParams;
};

const ALLOWED_METRICS = new Set([
  "population",
  "transfer_in",
  "transfer_out",
  "projection",
]);

const ALLOWED_WARDS = new Set([
  "東灘区",
  "灘区",
  "兵庫区",
  "長田区",
  "須磨区",
  "垂水区",
  "北区",
  "中央区",
  "西区",
]);

const ALLOWED_AGE_GROUPS = new Set([
  "0-9",
  "10-19",
  "20-29",
  "30-39",
  "40-49",
  "50-59",
  "60-64",
  "65+",
  "100+",
]);

async function extractParams(question: string): Promise<SqlSearchParams> {
  const openai = getOpenAI();
  const res = await openai.chat.completions.create({
    model: "gpt-5.4-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `
あなたは神戸市人口統計の検索パラメータ抽出AIです。
質問から以下のJSONを返してください:

{
  "metric": "population" | "transfer_in" | "transfer_out" | "projection" | null,
  "year": 数値 | null,
  "ward": 区名（例: "灘区"）| null,
  "ageGroup": "20-29" などの年齢グループ | null
}

metric:
- "population" → 人口・住民数
- "transfer_in" → 転入
- "transfer_out" → 転出
- "projection" → 将来推計
- null → 不明

不明な場合は null にしてください。
        `.trim(),
      },
      { role: "user", content: question },
    ],
  });

  const raw = JSON.parse(res.choices[0].message.content ?? "{}");

  return {
    metric: ALLOWED_METRICS.has(raw.metric) ? raw.metric : null,
    year:
      typeof raw.year === "number" && raw.year >= 2000 && raw.year <= 2070
        ? raw.year
        : null,
    ward:
      typeof raw.ward === "string" && ALLOWED_WARDS.has(raw.ward)
        ? raw.ward
        : null,
    ageGroup:
      typeof raw.ageGroup === "string" && ALLOWED_AGE_GROUPS.has(raw.ageGroup)
        ? raw.ageGroup
        : null,
  };
}

export async function sqlSearch(question: string): Promise<SqlSearchResult> {
  const params = await extractParams(question);
  const db = getDb();

  const conditions: string[] = [];
  const values: (string | number)[] = [];

  if (params.metric) {
    conditions.push("metric = ?");
    values.push(params.metric);
  }
  if (params.year) {
    conditions.push("year = ?");
    values.push(params.year);
  }
  if (params.ward) {
    conditions.push("ward = ?");
    values.push(params.ward);
  }
  if (params.ageGroup) {
    conditions.push("age_group = ?");
    values.push(params.ageGroup);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const sql = `
    SELECT year, ward, age_group, metric, SUM(value) AS value
    FROM population
    ${where}
    GROUP BY year, ward, age_group, metric
    ORDER BY year DESC, metric, ward, age_group
    LIMIT 100
  `;

  const result = await db.execute(sql, values, { fullResult: true });
  return {
    rows: (result.rows ?? []) as Record<string, unknown>[],
    params,
  };
}
