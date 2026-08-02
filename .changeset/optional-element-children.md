---
'foldkit': minor
'create-foldkit-app': patch
---

Element builders now take their children argument optionally. `h.div([h.Class('divider')])` and `h.div([h.Class('divider')], [])` build the same vnode, so an element with no children no longer needs a trailing empty array. Attributes stay required, so `h.div([])` remains the spelling for an element with neither. Void elements such as `img`, `input`, and `br` are unchanged and still accept attributes only. The scaffolded app's `AGENTS.md` teaches the shorter form.
