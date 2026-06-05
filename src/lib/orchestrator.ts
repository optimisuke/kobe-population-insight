/**
 * 質問を分析して必要な検索を選択し、結果を統合してAI回答を生成する
 */

import { getOpenAI } from "./openai";
import { sqlSearch, type SqlSearchResult } from "./search/sql";
import { ftsSearch, type FtsResult } from "./search/fts";
import { vectorSearch, type VectorResult } from "./search/vector";
import { isMockMode, mockOrchestrate } from "./mock";

export type SearchMode = "sql" | "fts" | "vector";

export type OrchestratorResult = {
  answer: string;
  searchModes: SearchMode[];
  sources: { title: string; url: string }[];
  chunks?: { source: string; excerpt: string }[];
  sqlResult?: {
    params: Record<string, unknown>;
    rowCount: number;
    rows: Record<string, unknown>[];
  };
};

export type HistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

type SearchPlan = {
  needsSql: boolean;
  needsPolicy: boolean;
};

async function planSearch(question: string): Promise<SearchPlan> {
  const openai = getOpenAI();
  const res = await openai.chat.completions.create({
    model: "gpt-5.4-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `
神戸市の人口に関する質問を分析して、以下のJSONを返してください:
{
  "needsSql": true/false,   // 人口統計データ（人口数、転入転出数、将来推計）が必要か
  "needsPolicy": true/false // 政策文書（計画書、ビジョン、施策）が必要か
}
        `.trim(),
      },
      { role: "user", content: question },
    ],
  });
  const raw = JSON.parse(res.choices[0].message.content ?? "{}");
  return {
    needsSql: Boolean(raw.needsSql),
    needsPolicy: Boolean(raw.needsPolicy),
  };
}

function formatSqlRows(result: SqlSearchResult): string {
  if (result.rows.length === 0) return "（該当するデータなし）";
  const header = Object.keys(result.rows[0]).join("\t");
  const rows = result.rows
    .slice(0, 30)
    .map((r) => Object.values(r).join("\t"))
    .join("\n");
  return `${header}\n${rows}`;
}

function formatPolicyChunks(chunks: (FtsResult | VectorResult)[]): string {
  return chunks
    .map(
      (c, i) =>
        `【${i + 1}】${c.source_title}\n${c.chunk_text.substring(0, 400)}`
    )
    .join("\n\n");
}

const HISTORY_LIMIT = 8; // 直近8件（4ターン）まで

export async function orchestrate(
  question: string,
  history: HistoryMessage[] = []
): Promise<OrchestratorResult> {
  if (isMockMode()) return mockOrchestrate(question);

  const plan = await planSearch(question);

  const searchModes: SearchMode[] = [];
  let sqlContext = "";
  let policyContext = "";
  const sources: { title: string; url: string }[] = [];
  const chunks: { source: string; excerpt: string }[] = [];
  let sqlResult: OrchestratorResult["sqlResult"];

  const tasks: Promise<void>[] = [];

  if (plan.needsSql) {
    tasks.push(
      sqlSearch(question).then((r) => {
        sqlContext = formatSqlRows(r);
        searchModes.push("sql");
        sqlResult = {
          params: r.params as Record<string, unknown>,
          rowCount: r.rows.length,
          rows: r.rows.slice(0, 10),
        };
      })
    );
  }

  if (plan.needsPolicy) {
    tasks.push(
      Promise.all([ftsSearch(question, 3), vectorSearch(question, 3)]).then(
        ([ftsChunks, vecChunks]) => {
          const seen = new Set<number>();
          const combined: (FtsResult | VectorResult)[] = [];
          for (const c of [...ftsChunks, ...vecChunks]) {
            if (!seen.has(c.id)) {
              seen.add(c.id);
              combined.push(c);
            }
          }
          policyContext = formatPolicyChunks(combined.slice(0, 5));
          if (ftsChunks.length > 0) searchModes.push("fts");
          if (vecChunks.length > 0) searchModes.push("vector");

          for (const c of combined.slice(0, 5)) {
            sources.push({ title: c.source_title, url: c.source_url });
            chunks.push({
              source: c.source_title,
              excerpt: c.chunk_text.substring(0, 200),
            });
          }
        }
      )
    );
  }

  await Promise.all(tasks);

  const openai = getOpenAI();
  const contextParts: string[] = [];
  if (sqlContext) contextParts.push(`【人口統計データ】\n${sqlContext}`);
  if (policyContext) contextParts.push(`【政策文書】\n${policyContext}`);

  const systemPrompt = `
あなたは神戸市の人口問題に詳しいアナリストです。
提供されたデータと文書をもとに、質問に対して日本語で分かりやすく回答してください。

ルール:
- 提供されたデータ・文書の範囲で回答する
- データがない場合は「データが見つかりませんでした」と伝える
- 数値を示すときは単位を明記する
- 簡潔に、でも重要な点は漏らさずに回答する
- 会話の文脈を踏まえて回答する
  `.trim();

  const userMessage =
    contextParts.length > 0
      ? `${contextParts.join("\n\n")}\n\n---\n\n質問: ${question}`
      : `質問: ${question}\n\n（参照できるデータが見つかりませんでした）`;

  // 直近N件の会話履歴を積む（最新の質問の直前まで）
  const recentHistory = history.slice(-HISTORY_LIMIT);

  const res = await openai.chat.completions.create({
    model: "gpt-5.5",
    messages: [
      { role: "system", content: systemPrompt },
      ...recentHistory,
      { role: "user", content: userMessage },
    ],
  });

  const answer =
    res.choices[0].message.content ?? "回答を生成できませんでした。";

  const uniqueSources = sources.filter(
    (s, i) => sources.findIndex((t) => t.url === s.url) === i
  );

  return { answer, searchModes, sources: uniqueSources, chunks, sqlResult };
}
