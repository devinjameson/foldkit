---
'create-foldkit-app': patch
---

Correct the scaffolded `AGENTS.md` testing guidance and relax its Message layout rule. Scene tests do not always run from the root `update`/`view`, so the template no longer claims a single root-level `scene.test.ts` is the right home for a multi-page app. It now says a test file lives in the folder holding the code it drives, blesses a page-scoped `scene.test.ts` for behavior that page owns, keeps the root-level file for flows that cross pages, and points at `repos/foldkit/examples/auth` for the shape. The Message layout section keeps one unbroken block of `m()` declarations as the rule for small unions and allows blank-line thematic clusters once a union grows past roughly a dozen Messages, with `S.Union([...])` and `type Message` still adjacent directly after the declarations.
