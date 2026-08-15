---
'@foldkit/oxlint-plugin': minor
---

Adds `foldkit/no-prevent-default-in-stream-operator`, which flags `event.preventDefault()` inside a callback passed to `Stream.map`, `Stream.mapEffect`, `Stream.filterMap`, `Stream.filter`, or `Stream.tap`. Those callbacks run on a later turn than the browser's event dispatch, so the default action has already happened and the call silently does nothing, whatever the Stream's source. The fix is `Subscription.fromEventPreventDefault`, whose mapper runs inside the dispatch and which calls `preventDefault()` for every handled event. The rule is on at error severity in `recommended`.
