---
name: API routing conventions
description: How Express routers are organized in the api-server artifact.
---

Router mount points in `routes/index.ts`:
- `/users` → users.ts: GET/PATCH /me
- `/events` → events.ts: CRUD for events
- `/events` → applications.ts: POST /:id/apply, POST /:id/cancel (ONLY these two)
- `/events` → reports.ts: GET/POST /:id/report, POST /:id/comments
- `/my` → my.ts: GET /stats, GET /applications, GET /hosted-events

**Why:** The applications.ts previously had `/my/applications` and `/my/hosted-events` routes which, when mounted at `/events`, would resolve to `/api/events/my/...` instead of `/api/my/...`. Moving them to my.ts fixes the routing.

**How to apply:** Any new "my" endpoints belong in my.ts, not applications.ts or events.ts.
