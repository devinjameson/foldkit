---
'foldkit': minor
---

Let Mount integrations observe whether the rendered view is `Live` or `Paused` through the new `viewStateChanges` Stream supplied to `Mount.define` and `Mount.defineStream` execution.

The Stream begins with the rendered view state at the moment the Mount is acquired and stays open for the Mount's lifetime. That initial state is retained across asynchronous setup before the Stream is consumed. A live-acquired Mount that survives a time-travel render stays acquired and observes `Live`, then `Paused`, then `Live` after the latest live view has been patched back into the DOM. A Mount inserted by a replay starts in `Paused`, and a runtime without time travel reports only `Live`.

A Mount acquired by a historical render cannot dispatch to the live Model. If the resumed live view reuses its element and declares a Mount there, Foldkit releases the replay acquisition before starting the live action with the current args and dispatch. A Mount acquired by the live view stays live so asynchronous setup and external streams can continue; its results follow the latest live Submodel wiring without crossing into historical wiring. Integrations use `viewStateChanges` to stop DOM-derived interaction while the historical view is installed. Commands, Subscriptions, ManagedResources, the live Model, and DevTools history also continue normally.

This reserves `viewStateChanges` as a runtime-supplied Mount execution field. Rename any Mount arg with that name before upgrading. The low-level `MountAction.f` view-state parameter is now required; MountAction wrappers must accept and forward it.

Custom renderers without time travel can pass the public `Mount.liveViewStateChanges` Stream to that parameter. It emits `Live` immediately and stays open.
