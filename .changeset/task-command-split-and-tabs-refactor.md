---
'foldkit': minor
---

### Breaking Changes

- **Task and Command separated** — `Task` now focuses on effect-based operations while `Command` handles message-producing side effects; failures moved to the error channel instead of being encoded in the success type
- **Tabs orientation moved to view config** — `orientation` is no longer part of the Tabs model; pass it through view configuration instead

### Fixes

- **Empty vdom rendering** — use a comment node instead of an empty text node when rendering empty virtual DOM trees, fixing edge cases with conditional rendering
