---
'foldkit': patch
---

Preserve raw style attributes when an element moves from typed style ownership to `h.Attribute('style', ...)`, including hydration updates, CSS shorthands, and custom properties.
