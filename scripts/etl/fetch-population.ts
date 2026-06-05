/**
 * 神戸市オープンデータの人口CSVをダウンロードする
 *
 * 対象:
 *   - 年齢別人口 (eurf310005)
 *   - 年齢別市外転入数 (eurf350001)
 *   - 年齢別市外転出数 (eurf351001)
 *   - 将来推計人口・全市 (suikeijinkou_kobecity_2025)
 *   - 将来推計人口・区別 (suikeijinkou_kubetu_2025)
 */

import { createWriteStream, mkdirSync } from "fs";
import { pipeline } from "stream/promises";
import { join } from "path";

const DATA_DIR = join(process.cwd(), "data", "population");
const BASE = "https://www.city.kobe.lg.jp";

const TARGETS = [
  // 年次データ（2019〜2024年分を取得）
  ...[2019, 2020, 2021, 2022, 2023, 2024].flatMap((y) => [
    {
      url: `${BASE}/documents/30092/${y}-eurf310005.csv`,
      file: `${y}-age-population.csv`,
      label: `${y}年 年齢別人口`,
    },
    {
      url: `${BASE}/documents/30092/${y}-eurf350001.csv`,
      file: `${y}-transfer-in.csv`,
      label: `${y}年 年齢別転入`,
    },
    {
      url: `${BASE}/documents/30092/${y}-eurf351001.csv`,
      file: `${y}-transfer-out.csv`,
      label: `${y}年 年齢別転出`,
    },
  ]),
  // 将来人口推計
  {
    url: `${BASE}/documents/78938/suikeijinkou_kobecity_2025.csv`,
    file: "projection-city-2025.csv",
    label: "将来推計・全市",
  },
  {
    url: `${BASE}/documents/78938/suikeijinkou_kubetu_2025.csv`,
    file: "projection-ward-2025.csv",
    label: "将来推計・区別",
  },
];

async function download(url: string, dest: string, label: string) {
  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`スキップ: ${label} (${res.status})`);
    return false;
  }
  const out = createWriteStream(dest);
  await pipeline(res.body as unknown as NodeJS.ReadableStream, out);
  const bytes = (await import("fs")).statSync(dest).size;
  console.log(`✓ ${label} → ${dest} (${(bytes / 1024).toFixed(0)} KB)`);
  return true;
}

async function main() {
  mkdirSync(DATA_DIR, { recursive: true });

  let ok = 0;
  let skip = 0;
  for (const t of TARGETS) {
    const dest = join(DATA_DIR, t.file);
    const success = await download(t.url, dest, t.label);
    success ? ok++ : skip++;
  }

  console.log(`\n完了: ${ok} ファイル取得, ${skip} ファイルスキップ`);
}

main().catch(console.error);
