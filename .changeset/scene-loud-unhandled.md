---
'foldkit': minor
---

Fail a Scene test on an interaction that fell through and was never acknowledged.

An event handler that runs and returns `Option.none()` lets the event fall through. Scene records that outcome, which `expectHandled()` and `expectIgnored()` assert on, and now fails when nothing acknowledges it. Acknowledge with `expectIgnored()` where falling through is the intended behavior. Where the event should have been consumed, the handler is the bug, and `expectHandled()` states that expectation and fails until it is fixed.

Without this, a test asserting "pressing this does nothing" passed whether the interaction was correctly inert or its handler had regressed into producing an inert Message, since neither case changes the Model, emits an OutMessage, or alters the DOM.

This is a breaking change for test suites. An existing Scene test that fires an interaction whose handler produces nothing, and asserts nothing about it, will now fail and needs `expectIgnored()` added. One acknowledgement covers one fall-through, so two in a row need one each, and each must come before the next interaction. An interaction on an element with no handler for that event has always thrown, so that case is unaffected, as are handled interactions, which need no acknowledgement.

The failure names the event and the target it was dispatched on, because it is raised at the next interaction or at the end of the scene rather than at the step itself. It is deferred rather than raised inside the interaction step, because a later `expectIgnored()` cannot opt out of an error already thrown.
