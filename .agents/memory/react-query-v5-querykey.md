---
name: QueryKey required in RQ v5 hooks
description: Orval-generated React Query v5 hooks require queryKey in UseQueryOptions when passing custom options.
---

## The rule
When passing `{ query: { enabled: ... } }` to orval-generated hooks, also include the queryKey:
```ts
useGetEvent(id, { query: { enabled: !!id, queryKey: getGetEventQueryKey(id) } });
```

## Why
React Query v5's `UseQueryOptions` type has `queryKey` as a required field. Orval generates hooks that accept `UseQueryOptions` directly in the `query` option slot, so TypeScript requires queryKey even though orval would normally provide it internally. Without it, TS2741 error.

## How to apply
Import the matching `getXxxQueryKey(...)` helper from `@workspace/api-client-react` and pass it alongside `enabled` whenever using conditional queries.
