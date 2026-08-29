---
'foldkit': patch
---

Reduce render overhead by caching unchanged document metadata, writing ordinary properties directly, and skipping masked module scans for VNodes with no module data. External metadata changes and URL updates are still reconciled on the next render.
