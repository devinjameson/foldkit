---
'foldkit': minor
'@foldkit/ui': minor
'@foldkit/devtools': minor
'@foldkit/devtools-mcp': minor
'@foldkit/markdown': minor
'@foldkit/vite-plugin': minor
---

Bump Effect to `4.0.0-rc.108` (from `4.0.0-beta.107`), the first Effect v4 release candidate. Foldkit's peer dependencies now require `effect@4.0.0-rc.108` and `@effect/platform-browser@4.0.0-rc.108`.

Pin your Effect packages to `4.0.0-rc.108` to match this release. While Effect v4 is in prerelease, pin the exact version rather than a range:

```sh
pnpm add effect@4.0.0-rc.108 @effect/platform-browser@4.0.0-rc.108
pnpm add -D @effect/vitest@4.0.0-rc.108
```
