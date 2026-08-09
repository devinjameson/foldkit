---
'@foldkit/ui': patch
---

Document `isDisabled` on Checkbox, Switch, and Slider.

Each component documented `isReadOnly` and left `isDisabled` bare, so the only description of what `isDisabled` emits lived inside its neighbor's comment. Each now describes the attributes it emits, that the control stays focusable, and which of the two flags to reach for. The Slider docs page gains the same guidance.
