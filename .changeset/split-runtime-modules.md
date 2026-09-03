---
'foldkit': patch
---

Split the runtime module into focused files: the Dispatch service, visibility resolution, DevTools config, slow-phase instrumentation, the duplicate id scanner, crash rendering, document metadata, the hydration handoff, the host connector for embedded apps, the HMR model bridge, and the browser scheduler each live in their own module beside `runtime.ts`. Public exports and behavior are unchanged.
