"use client";
import ReactMarkdown from "react-markdown";

type SearchMode = "sql" | "fts" | "vector";

function safeHref(url: string): string {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:" ? url : "#";
  } catch {
    return "#";
  }
}

export type Message = {
  role: "user" | "assistant";
  content: string;
  searchModes?: SearchMode[];
  sources?: { title: string; url: string }[];
  chunks?: { source: string; excerpt: string }[];
  sqlResult?: {
    params: Record<string, unknown>;
    rowCount: number;
    rows: Record<string, unknown>[];
  };
};

const BADGE: Record<SearchMode, { label: string; className: string }> = {
  sql: {
    label: "SQL",
    className: "bg-sky-100 text-sky-700 border border-sky-200",
  },
  fts: {
    label: "全文検索",
    className: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  },
  vector: {
    label: "ベクトル",
    className: "bg-violet-100 text-violet-700 border border-violet-200",
  },
};

export function MessageBubble({ message }: { message: Message }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[78%] bg-slate-200 text-slate-800 rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm">
          <p className="text-sm whitespace-pre-wrap leading-relaxed">
            {message.content}
          </p>
        </div>
      </div>
    );
  }

  const hasMeta =
    (message.searchModes && message.searchModes.length > 0) ||
    (message.sources && message.sources.length > 0) ||
    (message.chunks && message.chunks.length > 0);

  return (
    <div className="flex justify-start">
      <div className="max-w-[88%] space-y-1">
        {/* 本文カード */}
        <div className="bg-white border-l-4 border-l-red-500 border border-slate-200 rounded-r-2xl rounded-bl-2xl px-4 py-3 shadow-sm">
          <div className="text-sm text-slate-800 leading-relaxed prose prose-sm prose-slate max-w-none prose-p:my-1 prose-table:text-xs prose-th:py-1 prose-td:py-1">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        </div>

        {/* 検索詳細アコーディオン */}
        {(message.searchModes && message.searchModes.length > 0) && (
          <details className="group">
            <summary className="flex items-center gap-2 px-2 py-1 cursor-pointer list-none text-xs text-slate-400 hover:text-slate-600 select-none">
              <span className="transition-transform group-open:rotate-90">▶</span>
              <span>検索詳細</span>
              {message.searchModes && message.searchModes.length > 0 && (
                <span className="flex gap-1">
                  {message.searchModes.map((mode) => (
                    <span
                      key={mode}
                      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${BADGE[mode].className}`}
                    >
                      {BADGE[mode].label}
                    </span>
                  ))}
                </span>
              )}
            </summary>

            <div className="mt-1 ml-2 space-y-2">
              {/* SQL クエリ結果 */}
              {message.sqlResult && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                      SQL Result
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {message.sqlResult.rowCount} rows
                    </p>
                  </div>
                  {/* 抽出パラメータ */}
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(message.sqlResult.params)
                      .filter(([, v]) => v !== null)
                      .map(([k, v]) => (
                        <span
                          key={k}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-sky-50 border border-sky-200 rounded text-[10px] text-sky-700"
                        >
                          <span className="opacity-60">{k}:</span> {String(v)}
                        </span>
                      ))}
                  </div>
                  {/* 先頭数行プレビュー */}
                  {message.sqlResult.rows.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-[10px] text-slate-600">
                        <thead>
                          <tr className="border-b border-slate-200">
                            {Object.keys(message.sqlResult.rows[0]).map((k) => (
                              <th
                                key={k}
                                className="text-left py-0.5 pr-3 text-slate-400 font-medium"
                              >
                                {k}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {message.sqlResult.rows.slice(0, 5).map((row, i) => (
                            <tr key={i} className="border-b border-slate-100">
                              {Object.values(row).map((v, j) => (
                                <td key={j} className="py-0.5 pr-3">
                                  {String(v)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* 参照チャンク */}
              {message.chunks && message.chunks.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                    Retrieved Chunks
                  </p>
                  {message.chunks.map((c, i) => (
                    <div key={i} className="space-y-0.5">
                      <p className="text-[10px] font-medium text-slate-500">
                        {c.source}
                      </p>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {c.excerpt}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* 参照文書リンク */}
              {message.sources && message.sources.length > 0 && (
                <div className="space-y-0.5 px-1">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                    Sources
                  </p>
                  {message.sources.map((s, i) => (
                    <a
                      key={i}
                      href={safeHref(s.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-xs text-blue-500 hover:text-blue-700 hover:underline truncate"
                    >
                      ↗ {s.title}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
