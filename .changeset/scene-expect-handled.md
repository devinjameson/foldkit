---
'foldkit': minor
---

Add `Scene.expectHandled()` and `Scene.expectIgnored()`, which assert whether the preceding interaction's event handler produced a Message.

Scene had no way to express this and silently tolerated the negative case. `captureFromElement` resolved a handler that produced nothing back to the unchanged simulation, so an interaction whose handler ran and chose to return `Option.none()` left no trace. An element with no handler at all has always thrown; this is the narrower case of a handler that ran and let the event fall through.

That made a whole class of test vacuous. Any test of the shape "pressing this does nothing" passed whether the interaction was correctly inert or the handler had been deleted outright. In `@foldkit/ui` this was not hypothetical: replacing a read-only Listbox's commit branch with `Option.none()` left every listbox test passing, because the read-only tests asserted only the absence of an OutMessage and of Commands, and both hold when nothing is dispatched at all.

`expectHandled()` is the assertion behind "the key is consumed here". A handler that returns a Message is what makes `h.OnKeyDownPreventDefault` call `preventDefault()`, so a handled keydown is one whose browser default is suppressed: `Space` does not scroll the page and `Enter` does not submit a surrounding form. Reach for it rather than asserting the Message's tag, which couples the test to a name that is only the mechanism.

`expectIgnored()` is its complement, for where falling through is the intended behavior, so the intent is stated rather than left as the absence of any assertion.
