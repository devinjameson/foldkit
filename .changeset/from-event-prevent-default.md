---
'foldkit': minor
---

Adds `Subscription.fromEventPreventDefault`, the cancelling variant of `Subscription.fromEventFilterMap`. Its `toMessage` returns `Option.some(message)` to mark a dispatch handled, and the runtime calls `event.preventDefault()` and emits the Message, both synchronously inside the browser's event dispatch; `Option.none()` leaves the default behavior intact. The mapper never calls `preventDefault()` itself, mirroring `h.OnKeyDownPreventDefault` on the html side.

Browsers register `wheel`, `mousewheel`, `touchstart`, and `touchmove` listeners as passive by default when the target is `window`, `document`, `document.documentElement`, or `document.body`, and a passive listener ignores `preventDefault()` and logs a console warning. Because cancelling is the point, the helper registers its listener with `passive: false` when the config does not specify it, so those events stay cancelable on exactly the targets global Subscriptions listen on. Passing `passive: true` explicitly contradicts the helper's purpose and throws at construction.

The TSDoc for `fromEvent` and `fromEventFilterMap` claimed that calling `event.preventDefault()` inside the mapper works as expected. That claim is false when the listener is passive, which is what browsers register by default for wheel and touch events on window and document. The TSDoc and the Subscriptions docs page now state the exception, name the affected event types and targets, and show the `options: { passive: false }` fix.
