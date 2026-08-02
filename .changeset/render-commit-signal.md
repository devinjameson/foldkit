---
'foldkit': minor
---

`Render.afterCommit` and `Render.afterPaint` now wait on a commit signal the runtime publishes, instead of counting animation frames. Frame counting only lined up with the patch while the runtime committed inside its own `requestAnimationFrame` callback, so a render that the runtime hands to `document.startViewTransition` resumed waiters against the pre-patch DOM. Every `Dom` helper gates on `afterCommit` internally, so this affects `focus`, `clickElement`, `scrollIntoView`, and the rest inside a transitioning frame. Signatures are unchanged: the signal is read through `Effect.serviceOption`, so neither primitive gains a requirement and Effects built outside a runtime keep the previous frame-counting behavior.
