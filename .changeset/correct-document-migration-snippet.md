---
'create-foldkit-app': patch
'@foldkit/devtools': patch
'@foldkit/markdown': patch
'@foldkit/ui': patch
'foldkit': patch
---

Correct the root view example in the 0.134.0 migration guide. The snippet returned an `Html` value annotated as `Document`, which does not compile. `Document` is `{ title, body, ... }`, so both the before and after form now return that struct.
