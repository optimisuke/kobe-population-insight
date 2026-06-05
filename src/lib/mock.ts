/**
 * TiDB Cloud / OpenAI が未設定のときに返すモックデータ
 * 質問キーワードで回答を切り替えて、3つの検索モードが動いて見えるようにする
 */

import type { OrchestratorResult } from "./orchestrator";

const MOCK_SOURCES = [
  {
    title: "第6次神戸市総合基本計画",
    url: "https://www.city.kobe.lg.jp/a47946/sougoukihonkeikaku.html",
  },
  {
    title: "神戸市将来人口推計2025",
    url: "https://www.city.kobe.lg.jp/a47946/kobesyoraisuikei.html",
  },
];

type MockPattern = {
  keywords: string[];
  answer: string;
  searchModes: OrchestratorResult["searchModes"];
  sources: OrchestratorResult["sources"];
  chunks?: OrchestratorResult["chunks"];
  ftsKeywords?: string[];
};

const PATTERNS: MockPattern[] = [
  {
    keywords: ["転出", "流出", "出て行"],
    answer: `【モックデータ】2024年の年齢別転出数（神戸市全体）

20〜29歳: 約 12,400 人（最多）
30〜39歳: 約  8,200 人
10〜19歳: 約  4,100 人
65歳以上: 約  5,800 人

20代の転出が突出して多く、特に東京圏・大阪市への流出が目立ちます。2019年比で20代の転出は約8%増加しており、若年層の流出傾向は継続しています。

（これはモックデータです。実際のデータを使うには TiDB Cloud と OpenAI API の設定が必要です）`,
    searchModes: ["sql"],
    sources: [],
  },
  {
    keywords: ["転入", "来た", "増え"],
    answer: `【モックデータ】2024年の年齢別転入数（神戸市全体）

20〜29歳: 約 10,100 人
30〜39歳: 約  7,600 人
0〜 9歳:  約  3,200 人

転入数は転出数を下回っており、社会減が続いています。2024年の転入超過（または転出超過）は 20〜29歳で約 -2,300 人と最も大きいです。

（これはモックデータです。実際のデータを使うには TiDB Cloud と OpenAI API の設定が必要です）`,
    searchModes: ["sql"],
    sources: [],
  },
  {
    keywords: ["将来", "推計", "今後", "どうなる"],
    answer: `【モックデータ】神戸市将来人口推計（2025年版）

2025年: 約 149 万人
2030年: 約 143 万人（▲6万人）
2040年: 約 130 万人（▲19万人）
2050年: 約 115 万人（▲34万人）

生産年齢人口（15〜64歳）の割合は2025年の58%から2050年には52%に低下。65歳以上の割合は2050年に35%を超える見込みです。

（これはモックデータです。実際のデータを使うには TiDB Cloud と OpenAI API の設定が必要です）`,
    searchModes: ["sql"],
    sources: [MOCK_SOURCES[1]],
  },
  {
    keywords: ["政策", "対策", "取り組み", "施策", "どう考え", "捉え"],
    answer: `【モックデータ】神戸市の人口減少対策

第6次神戸市総合基本計画では、人口減少・少子高齢化を最重要課題の一つとして位置づけています。

主な施策:
・子育て支援の充実（保育所の待機児童ゼロ維持）
・UIJターン促進と若年層の定着支援
・産業振興による雇用創出
・スマートシティ推進による都市の魅力向上
・三宮再整備など都心の活性化

計画では「人口は減少しても活力ある都市」を目指し、2030年に向けた施策パッケージを定めています。

（これはモックデータです。実際のデータを使うには TiDB Cloud と OpenAI API の設定が必要です）`,
    searchModes: ["fts", "vector"],
    sources: [MOCK_SOURCES[0]],
    ftsKeywords: ["人口減少", "施策", "若年層", "定着"],
    chunks: [
      {
        source: "第6次神戸市総合基本計画",
        by: ["fts", "vector"] as ("fts" | "vector")[],
        excerpt:
          "人口減少・少子高齢化が進む中、神戸市は「人口が減少しても活力ある都市」を目標に掲げ、子育て支援の充実、産業振興、三宮再整備などの施策を総合的に推進する。",
      },
      {
        source: "第6次神戸市総合基本計画",
        by: ["vector"] as ("fts" | "vector")[],
        excerpt:
          "若年層の定着に向けては、UIJターン促進策として住宅取得支援や奨学金返還支援制度を拡充。2030年までに社会増減をプラスに転じることを目標とする。",
      },
    ],
  },
  {
    keywords: ["人口ビジョン", "ビジョン", "計画"],
    answer: `【モックデータ】神戸市人口ビジョン・総合基本計画の概要

神戸市は長期的な人口減少を前提に、以下の方向性を示しています:

1. 若年層の定住促進
   - 住みやすい環境整備（子育て・教育・雇用）
   - 関西・近畿圏からの転入促進

2. 少子化対策
   - 合計特殊出生率の向上目標（1.8 → 2.07）
   - 子育て世帯への経済的支援

3. 都市の質向上
   - 人口規模より「都市の活力」を維持する戦略
   - 高齢者・外国人も含めた多様な人材の活躍

（これはモックデータです。実際のデータを使うには TiDB Cloud と OpenAI API の設定が必要です）`,
    searchModes: ["fts", "vector"],
    sources: MOCK_SOURCES,
  },
];

const DEFAULT_MOCK: MockPattern = {
  keywords: [],
  answer: `【モックデータ】神戸市の人口概況（2024年）

総人口: 約 150 万人
世帯数: 約 73 万世帯

区別人口（上位3区）:
・西区:   約 20 万人
・北区:   約 20 万人
・中央区: 約 19 万人

直近の動向:
・自然減（死亡 > 出生）が続いており、年間約 6,000〜8,000 人の自然減
・社会増減は概ねプラスマイナスゼロ付近で推移

より詳しい分析は具体的な質問（例:「20代の転出は?」「将来推計は?」）をお試しください。

（これはモックデータです。実際のデータを使うには TiDB Cloud と OpenAI API の設定が必要です）`,
  searchModes: ["sql"],
  sources: [],
};

export function mockOrchestrate(question: string): OrchestratorResult {
  const q = question.toLowerCase();
  const matched = PATTERNS.find((p) => p.keywords.some((kw) => q.includes(kw)));
  const { answer, searchModes, sources, chunks, ftsKeywords } = matched ?? DEFAULT_MOCK;
  return { answer, searchModes, sources, chunks, ftsKeywords };
}

export function isMockMode(): boolean {
  return !process.env.TIDB_HOST || !process.env.OPENAI_API_KEY;
}
