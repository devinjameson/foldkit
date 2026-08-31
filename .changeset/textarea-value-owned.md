---
'foldkit': minor
'@foldkit/ui': minor
---

Reject children and `h.InnerHTML` passed to `h.textarea` or `h.keyed('textarea')` so the Model remains the field's single source of truth. This is a breaking change: move textarea content into the live value property with `h.Value(text)`. The UI Textarea helper now exposes the narrower `TextareaAttribute` group. Animation wrapper elements and Virtual List row elements also exclude `textarea` because both render children.
