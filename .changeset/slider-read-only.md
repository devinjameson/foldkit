---
'@foldkit/ui': minor
---

Add `isReadOnly` to Slider's view inputs.

A read-only Slider emits `aria-readonly="true"` on the thumb and `data-readonly` on every attribute group, remains focusable, and omits its pointerdown and keydown handlers. `isReadOnly` and `isDisabled` are independent, and either one removes the interaction handlers.
