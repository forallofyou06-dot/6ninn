---
name: Orval ZOD index.ts conflict
description: Orval workspace mode overwrites lib/api-zod/src/index.ts with both generated/api and generated/types exports, causing TS2308 duplicate export error.
---

## The rule
After running orval, immediately overwrite `lib/api-zod/src/index.ts` with only:
```ts
export * from "./generated/api";
```

## Why
Orval's workspace mode auto-generates a barrel `index.ts` that re-exports from `./generated/api` AND `./generated/types`. The `types/` folder (TypeScript interfaces) exports the same symbol names as `api.ts` (Zod schemas), causing TS2308 duplicate export errors. We removed the `schemas` option from the orval zod config so `types/` is no longer generated, but orval still writes the barrel with both re-exports.

## How to apply
The codegen script in `lib/api-spec/package.json` now auto-fixes this:
```
"codegen": "orval --config ./orval.config.ts && printf 'export * from \"./generated/api\";\\n' > ../api-zod/src/index.ts && pnpm -w run typecheck:libs"
```
If you manually run orval (not via the codegen script), you must also fix index.ts manually.
