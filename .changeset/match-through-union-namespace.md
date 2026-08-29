---
'foldkit': patch
'@foldkit/ui': patch
'@foldkit/devtools': patch
'@foldkit/vite-plugin': patch
'create-foldkit-app': patch
---

Match `defineTaggedUnion` and `defineRouteUnion` values through the union's own `match` instead of `Match.value` pipes with `Match.tagsExhaustive`. Internal call sites, the ssg template, and the generated FOLDKIT.md guidance now use the union method; behavior is unchanged.
