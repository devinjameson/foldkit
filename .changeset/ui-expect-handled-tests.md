---
'@foldkit/ui': patch
---

Assert the read-only commit suppression through `Scene.expectHandled()` instead of a hand-rolled `update` wrapper, and harden three tests that asserted nothing.

Listbox and Combobox recorded dispatched Messages by wrapping `update` and matching on the `SuppressedItemCommit` tag, because Scene could not express what the component actually promises. It promises the keypress is consumed, so the browser default is suppressed; the Message tag is the mechanism. Those four sites now use `expectHandled()` and `expectIgnored()` and drop the wrapper.

Three tests elsewhere asserted inertness with no assertion behind it, and now say so: RadioGroup's read-only Space, and Calendar's disabled-month and disabled-year Enter. Each held whether the key was correctly ignored or its handler had started producing a Message with no visible effect, which is the regression they exist to catch. Removing the handler outright has always thrown from the interaction step.

Test-only change. No API or behavior change.
