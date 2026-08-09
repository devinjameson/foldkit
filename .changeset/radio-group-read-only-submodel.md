---
'@foldkit/ui': minor
---

Turn RadioGroup into a Submodel and add `isReadOnly` to its view inputs.

RadioGroup now owns its keyboard focus in a Model. Create it with `RadioGroup.create<Value>()`, hold `RadioGroup.Model` in your Model, initialize it with `RadioGroup.init({ id })`, embed it with `h.submodel`, and fold the `Selected` OutMessage back into the field you pass in as `selectedValue`. The `id` and `onSelect` fields are gone: `id` moves to `init`, and the committed value now arrives as an OutMessage instead of a Message the config builds. Focus moves through a `FocusOption` Command rather than inside the view's event handlers, so a scene or story test resolves it like any other Command.

A read-only group keeps arrow, Home, End, PageUp, and PageDown focus navigation, reporting each move as a `FocusedOption` Message, and makes Space and clicking inert. The group carries `aria-readonly="true"` and `data-readonly`, and each option carries `data-readonly`. Because focus is modeled, `data-active`, `OptionInfo.isActive`, and `tabindex` follow the keyboard rather than staying pinned to the selection. `isReadOnly` and `isDisabled` are independent; a disabled option drops both its click and its keydown handler.
