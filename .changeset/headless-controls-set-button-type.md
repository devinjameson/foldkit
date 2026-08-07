---
'@foldkit/ui': patch
---

Set `type="button"` on the headless attribute groups a consumer can render as a `button`.

A `button` element with no `type` defaults to `type="submit"`, and `h.OnClick` dispatches a Message without calling `preventDefault`. Checkbox, Switch, Disclosure, RadioGroup, and Dialog hand their control attributes to the consumer's `toView` callback, so the consumer picks the element and the component could not know it was a button. Spreading one of those groups onto a `button` inside a `form`, which is an expected setup given that Checkbox, Switch, and RadioGroup support forms through `name` and `value`, meant a click both toggled the control and submitted the form.

The affected groups now emit `type="button"`: Checkbox's `checkbox`, Switch's `button`, Disclosure's `button`, RadioGroup's `option`, and Dialog's `closeButton`. It is emitted in every state, including disabled, read-only, and while a Dialog leave animation runs, because a bare `button` submits its form whether or not the component attached a handler.

Setting it is harmless on the other elements these groups target, such as a `div` or a `span`, because the builder assigns a DOM property rather than an HTML attribute. Nothing is serialized into the markup. Attributes apply in order, so a consumer who wants a submit control spreads a later `h.Type` to override it.

Menu, Listbox, and Combobox render their own `div` for items, so the consumer never chooses that element and they are unaffected.
