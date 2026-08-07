---
'@foldkit/ui': minor
---

Stop emitting `aria-disabled` from Input, Select, and Textarea

These three set the native `disabled` attribute, which already carries the state, so the extra `aria-disabled` restated native semantics in ARIA. The native attribute and `data-disabled` are unchanged. If you select on `[aria-disabled]` in CSS for one of these three, switch to `[data-disabled]`.
