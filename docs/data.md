# データソースと ETL

## 人口統計データ（構造化）

| データ | 出典 | 形式 | URL パターン |
|---|---|---|---|
| 年齢別人口 | 神戸市人口・人口動態データ集 | CSV (Shift-JIS) | `/documents/30092/YYYY-eurf310005.csv` |
| 年齢別転入 | 同上 | CSV (Shift-JIS) | `/documents/30092/YYYY-eurf350001.csv` |
| 年齢別転出 | 同上 | CSV (Shift-JIS) | `/documents/30092/YYYY-eurf351001.csv` |
| 将来推計・全市 | 神戸市将来人口推計2025 | CSV | `/documents/78938/suikeijinkou_kobecity_2025.csv` |
| 将来推計・区別 | 同上 | CSV | `/documents/78938/suikeijinkou_kubetu_2025.csv` |

取得年度: 2019〜2024年（`fetch-population.ts` で設定）

## 政策文書（非構造化）

| 文書 | 形式 | ページ |
|---|---|---|
| 第6次神戸市総合基本計画 | PDF | [リンク](https://www.city.kobe.lg.jp/a47946/sougoukihonkeikaku.html) |
| 神戸市将来人口推計2025（解説） | PDF | [リンク](https://www.city.kobe.lg.jp/a47946/kobesyoraisuikei.html) |
| 神戸2030ビジョン 第1〜3回資料 | PDF | [リンク](https://www.city.kobe.lg.jp/a47946/shise/kekaku/masterplan/jikikihonkeikaku00/2030visioinsuishin.html) |

## ETL 手順

```
# 1. 人口統計
npx tsx scripts/etl/fetch-population.ts   # → data/population/*.csv
npx tsx scripts/etl/import-population.ts  # CSV → population テーブル

# 2. 政策文書
npx tsx scripts/etl/fetch-policies.ts     # → data/policy/*.pdf
npx tsx scripts/etl/import-policies.ts    # PDF → チャンク → embedding → policy_chunks テーブル
```

## チャンク設定

| パラメータ | 値 |
|---|---|
| チャンクサイズ | 800 文字 |
| オーバーラップ | 100 文字 |
| embedding モデル | text-embedding-3-small (1536 次元) |
| バッチサイズ | 20 チャンク / API 呼び出し |

## スキーマ

```sql
-- 人口統計
population (id, year, ward, age_group, metric, value)
-- metric: population | transfer_in | transfer_out | projection

-- 政策文書
policy_chunks (id, source_title, source_url, page_number, chunk_text, embedding)
-- FULLTEXT INDEX ft_chunk_text(chunk_text)
-- VECTOR INDEX (hnsw, cosine) on embedding
```
