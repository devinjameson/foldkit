---
'foldkit': patch
---

Refuse server rendering a native `select` controlled through a client-only `CustomElement.define` property named `value`. Foldkit applies the property at different points in a fresh render and hydration, so it cannot describe one portable selection. Use `h.Value` for a server-rendered controlled select.
