---
'@foldkit/oxlint-plugin': minor
---

Adds `foldkit/no-empty-children-array`, which flags a builder call that passes an inline empty array as children. The argument is optional, so `h.div([h.Class('divider')], [])` should be written `h.div([h.Class('divider')])`, and `h.keyed('li')(key, [attrs], [])` should be written `h.keyed('li')(key, [attrs])`. Calls that pass a variable, a call, a conditional, or a non-empty array are left alone, and so is any method that is not an element builder. An array whose only content is a comment is also left alone, since dropping the argument would delete the comment with it.

The rule is on at error severity in `recommended`. The fix it asks for needs the `foldkit` release that made children optional, so bump `foldkit` alongside the plugin. On an older `foldkit`, omitting the argument does not compile.
