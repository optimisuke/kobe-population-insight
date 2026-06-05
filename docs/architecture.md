# アーキテクチャ

## システム構成

```
Browser (Next.js)
  Chat.tsx
   ├─ messages[] をローカル保持
   └─ 直近8件を history として POST /api/chat
         ↓ { message, history }
  /api/chat  (Route Handler)
         ↓
  orchestrator.ts
   ├─ [1] planSearch (gpt-4.1-mini)
   │       → needsSql? / needsPolicy? を判定
   │
   ├─ [2] 並列検索
   │   ├─ sqlSearch
   │   │    gpt-4.1-mini でパラメータ抽出（年, 区, 年齢, 指標）
   │   │    → 固定テンプレートSQL → TiDB: population
   │   │
   │   └─ ftsSearch + vectorSearch (同時)
   │        fts: gpt-4.1-mini でキーワード抽出 → MATCH AGAINST
   │        vec: text-embedding-3-small → VEC_COSINE_DISTANCE
   │        ↑ どちらも TiDB: policy_chunks
   │
   └─ [3] 結果統合 → gpt-4.1 で日本語回答生成
           history を messages に積む（直近8件）
```

## TiDB Cloud テーブル

| テーブル | 用途 | 検索方式 |
|---|---|---|
| `population` | 人口統計（年齢別・区別・年次） | SQL |
| `policy_chunks` | 政策文書チャンク + embedding | FTS / Vector |

## GPT 呼び出し回数（1質問あたり）

| ステップ | モデル | 呼び出し条件 |
|---|---|---|
| planSearch | gpt-4.1-mini | 毎回 |
| パラメータ抽出 | gpt-4.1-mini | SQL が必要な場合 |
| キーワード抽出 | gpt-4.1-mini | 政策文書が必要な場合 |
| embedding | text-embedding-3-small | 政策文書が必要な場合 |
| 回答生成 | gpt-4.1 | 毎回 |

最少2回（簡単な質問）、最多5回（SQL + 政策文書両方必要な質問）。

## SQL インジェクション対策

AI に SQL 文字列を直接生成させない。AI が抽出するのはパラメータ（年・区・年齢・指標）のみで、許可リスト（allowlist）で検証後に固定テンプレートに当てはめる。

## モックモード

`TIDB_HOST` または `OPENAI_API_KEY` が未設定の場合、外部 API を呼ばずにサンプル回答を返す（開発・デモ用）。
