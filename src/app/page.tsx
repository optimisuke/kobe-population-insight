import { Chat } from "@/components/Chat";

export default function Home() {
  return (
    <div className="flex flex-col h-full">
      <header className="bg-white border-b border-slate-200 px-6 py-4 shrink-0">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* ポートタワーをイメージした縦ライン装飾 */}
            <div className="flex gap-[3px] items-end h-8">
              <div className="w-[3px] h-4 bg-red-400 rounded-full opacity-70" />
              <div className="w-[3px] h-7 bg-red-500 rounded-full" />
              <div className="w-[3px] h-5 bg-red-400 rounded-full opacity-70" />
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <h1 className="text-slate-800 text-lg font-bold tracking-wide">
                  神戸市 人口インサイト
                </h1>
                <span className="text-slate-400 text-xs font-light tracking-widest hidden sm:block">
                  KOBE CITY
                </span>
              </div>
              <p className="text-slate-400 text-xs mt-0.5">
                Population Intelligence — SQL · Full-Text · Vector Search
              </p>
            </div>
          </div>
          {(!process.env.TIDB_HOST || !process.env.OPENAI_API_KEY) && (
            <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Mock mode
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 min-h-0 p-4 md:p-6 bg-slate-100">
        <div className="max-w-5xl mx-auto h-full">
          <Chat />
        </div>
      </main>
    </div>
  );
}
