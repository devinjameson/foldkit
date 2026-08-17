---
'create-foldkit-app': patch
---

The scaffolded SSR host takes the origin it serves from configuration rather than from the request, refuses a request target that resolves to another origin, answers a missing static asset with 404 rather than the application shell, and declares `Sec-Fetch-Dest` on any response whose selection inspected it.
