---
'foldkit': minor
---

Let Mount integrations observe whether the rendered view is `Live` or `Paused` through the new `viewStateChanges` Stream supplied to `Mount.define` and `Mount.defineStream` execution.

Each subscriber receives the current state immediately, and the Stream stays open for the Mount's lifetime. A Mount that survives a time-travel render stays acquired and observes `Live`, then `Paused`, then `Live` after the latest live view has been patched back into the DOM. A Mount inserted by a replay starts in `Paused`, and a runtime without time travel reports only `Live`.

Mount Messages emitted from paused historical DOM are now suppressed without interrupting the Mount fiber. Commands, Subscriptions, ManagedResources, the live Model, and DevTools history continue normally while the historical view is installed.

This reserves `viewStateChanges` as a runtime-supplied Mount execution field. Rename any Mount arg with that name before upgrading.
