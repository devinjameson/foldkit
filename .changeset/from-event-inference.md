---
'foldkit': minor
---

**Breaking.** `Subscription.fromEvent` and `Subscription.fromEventFilterMap` now resolve the event from the target and the event name, so neither type argument is written at the call site.

```ts
// Before
Subscription.fromEvent<KeyboardEvent, Message>({
  target: window,
  type: 'keydown',
  toMessage: event => PressedKey({ key: event.key }),
})

// After
Subscription.fromEvent({
  target: window,
  type: 'keydown',
  toMessage: event => PressedKey({ key: event.key }),
})
```

`type` is constrained to the events the target declares, so a misspelled name is a compile error rather than a listener that never fires, and TypeScript suggests the correction. `window` plus `'wheel'` gives a `WheelEvent`, `document` plus `'touchmove'` a `TouchEvent`, and a `MediaQueryList` plus `'change'` a `MediaQueryListEvent`. Both direct and thunk targets resolve the same way.

A target with no declared event map, such as a bare `EventTarget`, accepts any event name and reports `Event`. Annotate one with the new `Subscription.TypedEventTarget` to have its own events resolved, `CustomEvent` detail included:

```ts
const slowWarningTarget: Subscription.TypedEventTarget<{
  'foldkit:slow-warning': CustomEvent<SlowWarningReport>
}> = new EventTarget()
```

A declared map wins over the built-in table, so an element that dispatches its own custom events can be annotated too. `EventMapOf`, `EventOf`, and `EventTypeOf` are exported alongside it.

Beyond `window`, `document`, and the element interfaces, the table covers `MediaQueryList`, `ShadowRoot`, `VisualViewport`, `ScreenOrientation`, `AbortSignal`, `WebSocket`, `EventSource`, `XMLHttpRequest`, `Worker`, `ServiceWorker`, `MessagePort`, `BroadcastChannel`, `FileReader`, `Notification`, `MediaRecorder`, `MediaDevices`, `RTCPeerConnection`, `RTCDataChannel`, `PermissionStatus`, and `Animation`. A target outside it resolves to `Event` for any event name; annotate it with `TypedEventTarget` to do better.

**Migration.** Drop both type arguments from every `fromEvent` and `fromEventFilterMap` call. A custom `EventTarget` that dispatched a `CustomEvent` took `<CustomEvent, Message>` before; annotate the target with `TypedEventTarget` instead, which also types `event.detail` rather than leaving it `any`. Two other shapes change:

- `FromEventConfig` and `FromEventFilterMapConfig` now take `<Target, Type, Message>` in place of `<EventType, Message>`.
- Annotating the mapper's parameter is now checked against the resolved event rather than replacing it, so an annotation that contradicts the event name is an error. Widening it to `Event` still works.
- An event name whose type has widened to `string` no longer compiles against a target with a declared event map. A `const` binding keeps its literal type and is unaffected.
