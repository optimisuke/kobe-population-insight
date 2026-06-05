/**
 * Full Text Search: キーワードを LIKE で政策文書を検索する
 * TiDB Cloud Serverless は MATCH AGAINST 非対応のため LIKE ベースで実装
 */

import { getDb } from "../db";
import { getOpenAI } from "../openai";

export type FtsResult = {
  id: number;
  source_title: string;
  source_url: string;
  chunk_text: string;
  score: number;
};

async function extractKeywords(question: string): Promise<string> {
  const openai = getOpenAI();
  const res = await openai.chat.completions.create({
    model: "gpt-5.4-mini",
    messages: [
      {
        role: "system",
        content:
          "日本語の質問から全文検索用キーワードを3〜5語抽出してください。スペース区切りで返してください。余計な説明は不要です。",
      },
      { role: "user", content: question },
    ],
  });
  return res.choices[0].message.content?.trim() ?? question;
}

export async function ftsSearch(
  question: string,
  limit = 5
): Promise<FtsResult[]> {
  const raw = await extractKeywords(question);
  const keywords = raw.split(/\s+/).filter(Boolean).slice(0, 5);
  if (keywords.length === 0) return [];

  const db = getDb();

  // キーワードごとに LIKE 条件を作成し、マッチ数をスコアとして使う
  const likeConditions = keywords.map(() => `chunk_text LIKE ?`).join(" OR ");
  const scoreExpr = keywords.map(() => `(CASE WHEN chunk_text LIKE ? THEN 1 ELSE 0 END)`).join(" + ");
  const likeValues = keywords.map((kw) => `%${kw}%`);

  const result = await db.execute(
    `SELECT id, source_title, source_url, chunk_text,
            (${scoreExpr}) AS score
     FROM policy_chunks
     WHERE ${likeConditions}
     ORDER BY score DESC
     LIMIT ?`,
    [...likeValues, ...likeValues, limit],
    { fullResult: true }
  );

  return ((result.rows ?? []) as Record<string, unknown>[]).map((r) => ({
    id: Number(r.id),
    source_title: String(r.source_title),
    source_url: String(r.source_url),
    chunk_text: String(r.chunk_text),
    score: Number(r.score),
  }));
}
