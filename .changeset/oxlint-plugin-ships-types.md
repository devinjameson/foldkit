---
'@foldkit/oxlint-plugin': patch
---

Ship type declarations for `@foldkit/oxlint-plugin`. The package built with esbuild alone, which bundles the runtime but emits no `.d.ts`, so importing it from an `oxlint.config.ts` failed with "Could not find a declaration file for module '@foldkit/oxlint-plugin'". The build now also runs `tsc` to emit declarations into `dist`, and `package.json` points at them through `types` and a `types` condition in its exports.
