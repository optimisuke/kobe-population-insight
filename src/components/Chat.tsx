"use client";

import { useState, useRef, useEffect, FormEvent } from "react";
import { MessageBubble, type Message } from "./MessageBubble";

const HISTORY_LIMIT = 8;

const EXAMPLE_GROUPS = [
  {
    label: "人口動態",
    questions: [
      "神戸市はどの年代が流出している？",
      "若者の転出は増えている？",
      "人口は今後どうなる？",
    ],
  },
  {
    label: "政策・計画",
    questions: [
      "神戸市は人口減少をどう捉えている？",
      "人口ビジョンではどんな対策を示している？",
    ],
  },
];

export function Chat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "神戸市の人口統計データと政策文書をもとに質問にお答えします。\nSQL・全文検索・ベクトル検索を組み合わせて分析します。",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;

    const next: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, next]);
    setInput("");
    setLoading(true);

    // 最新メッセージを除いた直近N件を履歴として送る
    const history = messages
      .slice(-HISTORY_LIMIT)
      .map(({ role, content }) => ({ role, content }));

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.answer,
          searchModes: data.searchModes,
          sources: data.sources,
          chunks: data.chunks,
          sqlResult: data.sqlResult,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "エラーが発生しました。しばらく待ってから再度お試しください。",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  return (
    <div className="flex h-full gap-4">
      {/* サイドバー */}
      <aside className="hidden md:flex flex-col w-52 shrink-0 gap-4">
        {EXAMPLE_GROUPS.map((g) => (
          <div key={g.label} className="space-y-1.5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
              {g.label}
            </p>
            {g.questions.map((q) => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                disabled={loading}
                className="w-full text-left text-sm text-slate-600 bg-white border border-slate-200 rounded-xl px-3 py-2.5 hover:border-red-400 hover:text-red-700 hover:bg-red-50 transition-all duration-150 disabled:opacity-40 shadow-sm"
              >
                {q}
              </button>
            ))}
          </div>
        ))}
      </aside>

      {/* チャットエリア */}
      <div className="flex flex-col flex-1 min-w-0 bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {/* メッセージ一覧 */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {messages.map((m, i) => (
            <MessageBubble key={i} message={m} />
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border-l-4 border-l-red-300 border border-slate-200 rounded-r-2xl rounded-bl-2xl px-4 py-3 shadow-sm">
                <div className="flex gap-1.5 items-center">
                  {[0, 150, 300].map((delay) => (
                    <span
                      key={delay}
                      className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"
                      style={{ animationDelay: `${delay}ms` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* 入力フォーム */}
        <form
          onSubmit={handleSubmit}
          className="p-3 border-t border-slate-200 bg-white flex gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            placeholder="神戸市の人口について質問してください..."
            className="flex-1 text-sm border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent disabled:bg-slate-50 placeholder:text-slate-400"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="shrink-0 bg-slate-600 text-white text-sm font-medium rounded-xl px-5 py-2.5 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            送信
          </button>
        </form>
      </div>
    </div>
  );
}
