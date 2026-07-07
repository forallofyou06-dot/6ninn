---
name: Clerk + Vite setup
description: Installing Clerk in a pnpm monorepo Vite artifact and preventing CSS layer conflicts.
---

- `@clerk/react` and `@clerk/themes` must be installed in the specific artifact (`artifacts/app`), not the workspace root.
- `tailwindcss({ optimize: false })` in `vite.config.ts` is required to prevent Clerk CSS layer (`@layer clerk`) bugs at build time.
- CSS layer order in `index.css`: `@layer theme, base, clerk, components, utilities;` — clerk must appear before components/utilities.
- Import `@clerk/themes/shadcn.css` in `index.css` for the shadcn theme integration.

**Why:** Vite optimizes CSS layers by default, which breaks Clerk's `cssLayerName: "clerk"` appearance option.

**How to apply:** Any time Clerk is added to a new Vite/React artifact.
