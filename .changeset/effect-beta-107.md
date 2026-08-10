---
'foldkit': patch
'@foldkit/ui': patch
'@foldkit/devtools': patch
'@foldkit/devtools-mcp': patch
'@foldkit/vite-plugin': patch
---

Bump Effect to `4.0.0-beta.107` (from `4.0.0-beta.106`). Foldkit's peer dependencies now require `effect@4.0.0-beta.107` and `@effect/platform-browser@4.0.0-beta.107`.

Pin your Effect packages to `4.0.0-beta.107` to match this release. While Effect v4 is in beta, pin the exact version rather than a range:

```sh
pnpm add effect@4.0.0-beta.107 @effect/platform-browser@4.0.0-beta.107
pnpm add -D @effect/vitest@4.0.0-beta.107
```
