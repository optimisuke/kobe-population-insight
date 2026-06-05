/**
 * Full Text Search: TiDB の MATCH AGAINST で政策文書を検索する
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
  const keywords = await extractKeywords(question);
  const db = getDb();

  const result = await db.execute(
    `SELECT id, source_title, source_url, chunk_text,
            MATCH(chunk_text) AGAINST (? IN NATURAL LANGUAGE MODE) AS score
     FROM policy_chunks
     WHERE MATCH(chunk_text) AGAINST (? IN NATURAL LANGUAGE MODE)
     ORDER BY score DESC
     LIMIT ?`,
    [keywords, keywords, limit],
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
