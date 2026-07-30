---
'@foldkit/vite-plugin': patch
---

Force-include `effect/Boolean` in the dep optimizer. Foldkit's compiled dist imports the `Boolean` namespace from bare `'effect'`, so a consumer that never names it in their own source got a prebundled `effect.js` without it and crashed at runtime in dev.
