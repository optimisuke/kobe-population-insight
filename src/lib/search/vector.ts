/**
 * Vector Search: 質問のembeddingをTiDBのVEC_COSINE_DISTANCEで検索する
 */

import { getDb } from "../db";
import { getOpenAI } from "../openai";

export type VectorResult = {
  id: number;
  source_title: string;
  source_url: string;
  chunk_text: string;
  distance: number;
};

export async function vectorSearch(
  question: string,
  limit = 5
): Promise<VectorResult[]> {
  const openai = getOpenAI();

  const embRes = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: question,
  });
  const embedding = embRes.data[0].embedding;
  const embeddingStr = `[${embedding.join(",")}]`;

  const db = getDb();
  const result = await db.execute(
    `SELECT id, source_title, source_url, chunk_text,
            VEC_COSINE_DISTANCE(embedding, ?) AS distance
     FROM policy_chunks
     ORDER BY distance ASC
     LIMIT ?`,
    [embeddingStr, limit],
    { fullResult: true }
  );

  return ((result.rows ?? []) as Record<string, unknown>[]).map((r) => ({
    id: Number(r.id),
    source_title: String(r.source_title),
    source_url: String(r.source_url),
    chunk_text: String(r.chunk_text),
    distance: Number(r.distance),
  }));
}
