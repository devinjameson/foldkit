---
'@foldkit/oxlint-plugin': minor
---

Two new rules keep imports flowing the way the Project Organization pattern lays a project out. Both decide from the file's own path plus its import declarations, so neither needs cross-file state.

`foldkit/no-cross-page-imports` rejects a file in one page module importing another page module, and rejects a page importing the page barrel, which re-exports every sibling. Pages are siblings the app composes, so what two of them share belongs in a domain module or at the app level.

`foldkit/no-app-update-or-view-import-in-page` rejects a page importing the app level `update` or `view`. Composition runs one way. A page that imports what folds it in closes a cycle and pulls the whole app into the page's own tests. A shared module that lives inside the app view directory, such as `view/icon`, is shared code rather than the composition root, so it stays available.

Both rules leave a file sitting directly in the page container alone. A path cannot tell a single file page apart from a helper that lives beside the pages, and the website does both.

Off by default like the rest of the opt-in set. Turn them on with `"foldkit/no-cross-page-imports": "error"` and `"foldkit/no-app-update-or-view-import-in-page": "error"`.
