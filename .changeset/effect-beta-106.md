---
'foldkit': patch
'@foldkit/ui': patch
'@foldkit/devtools': patch
'@foldkit/devtools-mcp': patch
'@foldkit/vite-plugin': patch
---

Bump Effect to `4.0.0-beta.106` (from `4.0.0-beta.105`). Foldkit's peer dependencies now require `effect@4.0.0-beta.106` and `@effect/platform-browser@4.0.0-beta.106`.

Pin your Effect packages to `4.0.0-beta.106` to match this release. While Effect v4 is in beta, pin the exact version rather than a range:

```sh
pnpm add effect@4.0.0-beta.106 @effect/platform-browser@4.0.0-beta.106
pnpm add -D @effect/vitest@4.0.0-beta.106
```
