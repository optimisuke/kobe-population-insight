# kobe-population-insight

神戸市の人口統計データ × 政策文書 × AI による洞察アプリ。

SQL検索・全文検索・ベクトル検索を TiDB Cloud の単一データベースで実現。

## セットアップ

### 1. TiDB Cloud Serverless クラスター作成

1. [TiDB Cloud](https://tidbcloud.com/) でアカウント作成・Serverless クラスター作成
2. **Connect** から接続情報（host / user / password）を取得

### 2. OpenAI API キー取得

[OpenAI Platform](https://platform.openai.com/api-keys) で API キーを発行

### 3. 環境変数設定

```bash
cp .env.example .env.local
# .env.local を編集して各値を設定
```

`.env.example` を参照。`AUTH_PASSWORD` は Vercel デプロイ時の簡易認証用（未設定なら認証スキップ）。

### 4. インストール・スキーマ適用・データ投入

```bash
npm install
npx tsx scripts/apply-schema.ts

# 人口統計 CSV（神戸市オープンデータ）
npx tsx scripts/etl/fetch-population.ts
npx tsx scripts/etl/import-population.ts

# 政策文書 PDF（OpenAI API コストが発生）
npx tsx scripts/etl/fetch-policies.ts
npx tsx scripts/etl/import-policies.ts
```

### 5. 開発サーバー起動

```bash
npm run dev   # → http://localhost:3000
```

## 質問例

- 神戸市はどの年代が流出している？
- 若者の転出は増えている？
- 人口は今後どうなる？
- 神戸市は人口減少をどう捉えている？

## システム構成

```
Next.js / app/api/chat
  ├─ 質問分析    (gpt-5.4-mini)
  ├─ SQL検索     → population テーブル
  ├─ 全文検索    → policy_chunks (LIKE)
  ├─ ベクトル検索 → policy_chunks (VEC_COSINE_DISTANCE)
  └─ 回答生成    (gpt-5.5)

TiDB Cloud Serverless
  ├─ population      (転入転出・将来推計)
  └─ policy_chunks   (政策文書チャンク + VECTOR(1536))
```

## Vercel デプロイ

```bash
vercel --prod
```

Vercel Dashboard の Environment Variables に以下を設定する（`.env.example` 参照）。

```
TIDB_HOST=
TIDB_PORT=
TIDB_USER=
TIDB_PASSWORD=
TIDB_DATABASE=
OPENAI_API_KEY=
AUTH_PASSWORD=   # 簡易認証用。未設定なら認証スキップ
```

> `@tidbcloud/serverless` は HTTP 経由で接続するため、VPC ピアリング等の追加設定は不要。

## テスト

```bash
npm test          # ユニット・統合テスト（vitest）
npm run test:e2e  # E2E テスト（Playwright）
```

## 環境削除（シャットダウン手順）

費用が発生するリソースを止めるときは以下の順番で削除する。

1. **Vercel** — プロジェクトの Settings → Delete Project
2. **TiDB Cloud** — クラスターの `...` → Delete（Serverless は月 5GB まで無料だが不要なら削除）
3. **OpenAI API キー** — 該当キーの Revoke（任意・漏洩リスク対策）
4. **GitHub リポジトリ** — Settings → Delete this repository（任意）
