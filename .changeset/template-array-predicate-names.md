---
'create-foldkit-app': patch
---

Fix the Effect array predicate names in the scaffolded `AGENTS.md`. The template told agents to use `Array.isEmptyArray` / `Array.isNonEmptyArray`, which Effect does not export. The correct names are `Array.isArrayEmpty` / `Array.isArrayNonEmpty`. The same rule now also prohibits `.length > 0`, not just `.length === 0`.
