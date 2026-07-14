# 偶然の6人

社内の少人数交流会（最大6人・2時間・5,000円以内）を気軽に開催できる、モバイルファーストWebアプリです。

## Architecture

- Frontend: React 19, Vite, Tailwind CSS, shadcn/ui
- Hosting: GitHub Pages
- Database: Supabase PostgreSQL
- Authentication: Supabase Auth（メールアドレス・パスワード）
- Authorization: PostgreSQL Row Level Security + RPC
- Data fetching: Supabase JavaScript client + TanStack Query

GitHub Pagesは静的フロントエンドのみを配信します。イベント作成、先着申込、キャンセル、レポート投稿、通知、事務局集計など、整合性や権限が必要な処理はすべてSupabaseのDB関数で実行します。

## Local development

```bash
cp .env.example .env.local
pnpm install
pnpm --filter @workspace/app dev
```

`.env.local`に次を設定します。

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_KEY
BASE_PATH=/
```

公開用キーはブラウザに埋め込まれることを前提としたキーです。`service_role`キーやSecret keyは、ローカル環境・GitHub Secrets・フロントエンドコードのいずれにも設定しないでください。

## Supabase setup

1. Supabaseでプロジェクトを作成します。
2. SQL Editorで次のマイグレーションを番号順に実行します。
   - [`supabase/migrations/202607140001_initial_schema.sql`](supabase/migrations/202607140001_initial_schema.sql)
   - [`supabase/migrations/202607140002_event_rules_and_names.sql`](supabase/migrations/202607140002_event_rules_and_names.sql)
   - すでに`001`を実行済みの場合は、`002`だけを実行してください。
3. Authentication → URL Configurationを開きます。
4. Site URLを `https://forallofyou06-dot.github.io/6ninn/` に設定します。
5. Redirect URLsにも同じURLを追加します。
6. 事務局ユーザーが初回ログインした後、SQL Editorで役割を設定します。

```sql
update public.profiles
set role = 'maintainer'
where email = 'YOUR_EMAIL';
```

DB関数、制約、RLS、インデックス、Authユーザー同期トリガーはマイグレーションに含まれています。最低催行人数は主催者を含めて3人固定です。

### Authentication email setup

Supabase標準のメール送信機能は動作確認用で、プロジェクト全体で1時間に2通までです。本番運用ではSupabase Dashboardの `Authentication → Emails → SMTP Settings` でカスタムSMTPを設定してください。設定後は `Authentication → Rate Limits` で利用規模に合う送信上限を設定します。

アプリ側では同じブラウザからの再送を60秒間停止し、送信上限に達した場合は日本語の案内を表示します。ただし、プロジェクト全体の送信枠を増やすにはカスタムSMTPの設定が必要です。

メール確認を使わず、登録直後からパスワードでログインできるようにする場合は、Supabase Dashboardの `Authentication → Sign In / Providers → Email` で `Confirm email` をオフにします。この場合、カスタムSMTPの設定は不要です。社内検証中はこの設定が最も簡単です。

## GitHub Pages setup

リポジトリの Settings → Secrets and variables → Actions に次のRepository secretsを追加します。

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Settings → Pages → Build and deployment → Source は `GitHub Actions` を選択します。`main`へのpushで `.github/workflows/deploy-pages.yml` が型チェック、ビルド、公開を実行します。

公開URL:

`https://forallofyou06-dot.github.io/6ninn/`

## Commands

```bash
pnpm run typecheck
pnpm run build
pnpm --filter @workspace/app dev
```

GitHub Pagesの深いURLを直接開いた場合も動作するよう、`public/404.html`でSPAルートを復元します。
