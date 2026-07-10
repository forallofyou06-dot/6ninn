# 偶然の6人

社内の少人数交流会（最大6人・2時間・5000円以内）を気軽にひらけるモバイルファーストWebアプリ。

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/app run dev` — run the frontend (dynamic port via $PORT)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/scripts run seed` — seed demo data
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 + Clerk auth (@clerk/express)
- Frontend: React + Vite + Tailwind v4 + shadcn/ui + Clerk (@clerk/react)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec → React Query hooks + Zod schemas)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/db/src/schema/index.ts` — DB schema (users, events, participations, reports, likes, notifications, feedbacks)
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for API contract)
- `lib/api-client-react/src/generated/` — generated React Query hooks + Zod schemas
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/app/src/pages/` — React pages
- `artifacts/app/src/index.css` — Tailwind theme (Shippori Mincho + Zen Kaku Gothic New)

## Architecture decisions

- **Contract-first API**: OpenAPI spec → Orval codegen → typed hooks. Never write fetch calls by hand.
- **Clerk auth**: Magic link (email only). メールドメイン制限はコード上未実装（Clerk ダッシュボード側で制御する想定）。
- **JIT user provisioning**: `getOrCreateUser()` creates a DB user on first authenticated request using Clerk identity data.
- **My routes**: `GET /api/my/applications`, `/api/my/hosted-events`, `/api/my/stats` are in `my.ts` router. participations.ts only has `/:id/apply` and `/:id/cancel`.
- **定員はホスト含む6人**: capacity フィールドはホストを含む総定員。参加者上限は capacity-1。サーバー・フロント両方で検証済み。
- **role 変更は不可**: `PATCH /users/me` では name/department/interestTags のみ更新可。role はサーバー側で除外。
- **いいね**: `POST /reports/:id/like` でトグル。likesTable は targetType/targetId のポリモーフィック設計。
- **通知生成**: 申込・キャンセル時にホストへ自動通知（participations.ts）。
- **レポート権限**: host タイプ投稿はホストのみ、participant タイプは申込済み参加者のみ。
- **6人以内・2時間以内・5000円以内**: Business constraints validated in both frontend (Zod schema) and server-side.

## Product

- ランディング → サインイン/サインアップ（Clerkマジックリンク）
- イベント一覧（募集中の会）・詳細・申し込み（先着順）・キャンセル
- 会をひらく（新規作成）・編集
- 開催レポート投稿（ホスト）・参加者コメント
- マイページ：参加統計・参加履歴

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- `@clerk/react` and `@clerk/themes` must be installed in `artifacts/app` (not workspace root).
- `tailwindcss({ optimize: false })` in `vite.config.ts` is required to prevent Clerk CSS layer bugs.
- Always run codegen after changing `openapi.yaml`: `pnpm --filter @workspace/api-spec run codegen`
- Seed data: run `pnpm --filter @workspace/scripts run seed` (requires `@workspace/db` in scripts dependencies)

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
