# kobe-population-insight

神戸市の人口統計データ × 政策文書 × AI による洞察アプリ。

**SQL検索 / 全文検索 / ベクトル検索** を TiDB Cloud の単一データベースで実現。

---

## セットアップ

### 1. TiDB Cloud Serverless クラスター作成

1. [TiDB Cloud](https://tidbcloud.com/) でアカウント作成・Serverlessクラスター作成
2. **Connect > Connect to your cluster > TypeScript** から接続情報を取得

### 2. OpenAI API キー取得

[OpenAI Platform](https://platform.openai.com/api-keys) でAPIキーを発行

### 3. 環境変数設定

```bash
cp .env.example .env.local
# .env.local を編集して TIDB_* と OPENAI_API_KEY を設定
```

### 4. インストール・スキーマ適用・データ投入

```bash
npm install
npx tsx scripts/apply-schema.ts
npx tsx scripts/etl/fetch-population.ts
npx tsx scripts/etl/import-population.ts
npx tsx scripts/etl/fetch-policies.ts
npx tsx scripts/etl/import-policies.ts   # OpenAI API コストが発生
```

### 5. 開発サーバー起動

```bash
npm run dev   # → http://localhost:3000
```

---

## 質問例

- 神戸市はどの年代が流出している？
- 若者の転出は増えている？
- 人口は今後どうなる？
- 神戸市は人口減少をどう捉えている？

---

## システム構成

```
Next.js / app/api/chat
  ├─ 質問分析 (GPT-4o-mini)
  ├─ SQL検索    → population テーブル
  ├─ 全文検索   → policy_chunks (MATCH AGAINST)
  ├─ ベクトル検索→ policy_chunks (VEC_COSINE_DISTANCE)
  └─ 回答生成  (GPT-4o)

TiDB Cloud Serverless
  ├─ population     (住民基本台帳・転入転出・将来推計)
  └─ policy_chunks  (政策文書チャンク + VECTOR(1536))
```

---

## 環境削除（シャットダウン手順）

費用が発生するリソースを止めるときは以下の順番で削除する。

### 1. Vercel プロジェクト削除

https://vercel.com/optimisukes-projects/kobe-population-insight/settings

Settings → **Delete Project**

### 2. TiDB Cloud クラスター削除

https://tidbcloud.com/

対象クラスター → **...** → **Delete**

> Serverless は月5GBまで無料だが、念のため使わないなら削除する

### 3. OpenAI API キー無効化（任意）

https://platform.openai.com/api-keys

該当キーの **Revoke** ボタン

> キーを残しておくと第三者に漏洩した際のリスクになる

### 4. GitHub リポジトリ削除（任意）

https://github.com/optimisuke/kobe-population-insight

Settings → **Delete this repository**

---

## 旧 Getting Started

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
