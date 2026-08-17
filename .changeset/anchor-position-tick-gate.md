---
'@foldkit/ui': patch
---

Report a failed anchor positioning tick through `console.error` instead of letting it escape as an unhandled rejection, and apply the tick gate to every panel rather than only to placement-locked ones.

`anchorSetup` positions through a promise chain that had no rejection handler. `computePosition` awaits platform measurement and every middleware, so a throw in any of them rejects the tick, and that rejection reached the window unhandled.

It is now reported, rather than either escaping or being swallowed silently. A panel that never appears with nothing logged is the hard case to debug, since the caller renders `visibility: hidden` and only a successful tick clears it. A run of consecutive failures is reported once, because the panel repositions on every scroll and resize and a persistent failure would otherwise repeat on each one. A fresh failure after a recovery is reported again.

The gate that keeps at most one tick in flight, so the last write always wins, was conditional on `isPlacementLocked`. That tied a concurrency guard to an unrelated positioning flag. It now applies to every anchored panel. This part changes no behavior: with the current `@floating-ui/dom` a tick settles inside a microtask chain, and each `autoUpdate` callback returns through a microtask checkpoint, so two ticks are never in flight together and the gate does not engage. It makes the invariant hold by construction rather than by coincidence.

Placement locking is unchanged.
