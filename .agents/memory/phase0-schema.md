---
name: Phase 0 schema decisions
description: DB schema design decisions from Phase 0 rebuild — tables, constraints, profile check
---

## Tables (9)
users, events, participations, reports, likes, tags, eventTags, notifications, feedbacks

## Key decisions
- `users.name` is nullable — null means profile not yet complete (profileComplete = name is not null)
- `users.role` default = "member"; values: member/host/office/maintainer
- `users.interestTags` = text[] (postgres array), default []
- `participations` replaces old `applications`; status = "申込" | "キャンセル"
- `events.status` = "募集中" | "実施確定" | "未実施" | "開催済"
- `events` adds: minParticipants, deadline (date), notes, durationMinutes

## requireAuth
Domain restriction (@0101.co.jp) removed — spec says recommended only, not required.

**Why:** Requirements doc v1.0 ch5 says 社内メールドメインは必須にせず推奨.

## Profile check flow
ProfileGuard in App.tsx calls GET /api/users/me after sign-in, checks profileComplete flag.
If false → redirect to /onboarding. Onboarding calls PATCH /api/users/me with Clerk Bearer token via useAuth().getToken().

## Route structure
- applications.ts → deprecated stub (logic moved to participations.ts)
- reports.ts → updated to use reportsTable (type, content, photoUrl, no commentsTable)
- events.ts → uses participationsTable for seat count/isApplied
