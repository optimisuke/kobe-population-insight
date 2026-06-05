/**
 * 政策文書PDFをチャンク分割してembeddingを生成し、TiDBのpolicy_chunksテーブルに投入する
 *
 * 処理フロー:
 *   PDF → テキスト抽出 → チャンク分割(500〜1000文字, overlap100) → embedding生成 → TiDB投入
 *
 * 実行前:
 *   npx tsx scripts/etl/fetch-policies.ts
 *   .env.local に TIDB_* と OPENAI_API_KEY を設定
 */

import { connect } from "@tidbcloud/serverless";
import { existsSync, readdirSync, readFileSync } from "fs";
import { join } from "path";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse") as (
  buffer: Buffer
) => Promise<{ text: string }>;
import OpenAI from "openai";
import "dotenv/config";

const DATA_DIR = join(process.cwd(), "data", "policy");
const CHUNK_SIZE = 800;
const OVERLAP = 100;
const EMBED_BATCH = 20;

type PolicyMeta = {
  file: string;
  title: string;
  sourceUrl: string;
};

function chunkText(text: string): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length);
    const chunk = text.slice(start, end).trim();
    if (chunk.length > 50) {
      chunks.push(chunk);
    }
    start += CHUNK_SIZE - OVERLAP;
  }
  return chunks;
}

async function embedBatch(
  openai: OpenAI,
  texts: string[]
): Promise<number[][]> {
  const res = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: texts,
  });
  return res.data.map((d) => d.embedding);
}

async function main() {
  const conn = connect({
    host: process.env.TIDB_HOST!,
    port: Number(process.env.TIDB_PORT ?? 4000),
    user: process.env.TIDB_USER!,
    password: process.env.TIDB_PASSWORD!,
    database: process.env.TIDB_DATABASE,
    ssl: { minVersion: "TLSv1.2" },
  });
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // クリア（再実行用）
  console.log("policy_chunks テーブルをクリア中...");
  await conn.execute("DELETE FROM policy_chunks");

  const metaPath = join(DATA_DIR, "meta.json");
  if (!existsSync(metaPath)) {
    throw new Error(
      "data/policy/meta.json が見つかりません。fetch-policies.ts を先に実行してください"
    );
  }
  const metas: PolicyMeta[] = JSON.parse(readFileSync(metaPath, "utf-8"));

  let totalChunks = 0;

  for (const meta of metas) {
    const filePath = join(DATA_DIR, meta.file);
    if (!existsSync(filePath)) {
      console.warn(`スキップ: ${meta.file} が存在しません`);
      continue;
    }

    console.log(`処理中: ${meta.title}`);

    const pdfBuffer = readFileSync(filePath);
    const parsed = await pdfParse(pdfBuffer);
    const rawText = parsed.text
      .replace(/\s+/g, " ")
      .replace(/([。！？])/g, "$1\n")
      .trim();

    console.log(`  テキスト長: ${rawText.length} 文字`);

    const chunks = chunkText(rawText);
    console.log(`  チャンク数: ${chunks.length}`);

    // バッチでembedding生成 → 挿入
    for (let i = 0; i < chunks.length; i += EMBED_BATCH) {
      const batch = chunks.slice(i, i + EMBED_BATCH);
      const embeddings = await embedBatch(openai, batch);

      for (let j = 0; j < batch.length; j++) {
        const chunkIdx = i + j;
        const embedding = `[${embeddings[j].join(",")}]`;
        await conn.execute(
          `INSERT INTO policy_chunks (source_title, source_url, page_number, chunk_text, embedding)
           VALUES (?, ?, ?, ?, ?)`,
          [meta.title, meta.sourceUrl, chunkIdx, batch[j], embedding]
        );
      }

      const done = Math.min(i + EMBED_BATCH, chunks.length);
      process.stdout.write(`\r  embedding生成中: ${done}/${chunks.length}`);
    }

    console.log(`\n  ✓ ${chunks.length} チャンク挿入`);
    totalChunks += chunks.length;
  }

  console.log(`\n完了: 計 ${totalChunks} チャンク挿入`);
}

main().catch(console.error);
