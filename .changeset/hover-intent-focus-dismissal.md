---
'@foldkit/ui': minor
---

Close HoverIntent without the pointer grace delay when focus leaves the trigger and panel. The zero-delay close still lets focus moving into the panel cancel dismissal before it resolves, while explicit click-away and Tab-away interactions now feel immediate.

Add `HoverIntent.close` for parent domain events that should dismiss the panel immediately, such as selecting an item from a hover menu. It invalidates pending transitions, clears panel engagement, and emits `Closed` when visibility changes.
