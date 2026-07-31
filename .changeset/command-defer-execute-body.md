---
'foldkit': patch
'@foldkit/ui': patch
---

Defer a Command's `execute` body until the runtime executes it.

`Command.define` invoked the `execute` body as soon as update constructed the Command. Only the resulting Effect was deferred, so every expression the body evaluated on the way to returning that Effect ran immediately, inside a pure reducer.

A body that reaches for a browser API therefore threw from update itself. `Popover.update` raised `ReferenceError: CSS is not defined` outside a browser, because `InertOthers` builds its selectors with `CSS.escape` and update constructs that Command unconditionally. It threw for a non-modal popover too, where the Command is built and then discarded. That made `@foldkit/ui` popovers, and the picker, combobox, menu, and date picker built on them, unusable in a headless Story even though no Effect ever ran.

The body is now suspended, so constructing a Command runs none of it. No side effect the body performs and no exception it raises can reach update, a Command that update builds and discards runs nothing at all, and a throwing body surfaces as a contained Effect failure the runtime reports with the Message that caused it, rather than an exception escaping the reducer.

This applies to Commands that declare `args`, on both the plain and the interruptible paths. A Command with no `args` already received `execute` as an Effect value and never had the problem. Interrupt keys are still derived at construction, so nothing about interrupt addressing changes.

Thanks @artile for the report and the diagnosis.
