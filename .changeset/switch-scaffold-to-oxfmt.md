---
'create-foldkit-app': minor
---

Scaffold new projects with Oxfmt instead of Prettier. The generated project ships `.oxfmtrc.json` with the same formatting options and import grouping the Prettier setup had, its `format` script runs `oxfmt`, and its `.oxlintrc.json` enables the `sort-imports` rule so named import specifiers stay sorted, which Oxfmt does not do on its own. The `prettier` and `@trivago/prettier-plugin-sort-imports` devDependencies are no longer installed.
