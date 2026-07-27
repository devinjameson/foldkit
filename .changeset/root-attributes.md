---
'foldkit': minor
---

Add `rootAttributes`, the mirror of `childAttributes`, for shared view helpers that dispatch app-level Messages from inside a Submodel.

A handler's dispatcher is chosen by where the element is built, not by the Message it carries. `html<Message>()`'s type argument is erased and the runtime reads the boundary off the current frame, so a shared helper that constructs an app-level Message works at the root and breaks inside a Submodel: the boundary applies its `toParentMessage`, that wrapper is a Schema constructor, and it throws on the foreign Message inside the event listener. Nothing is dispatched, no `update` runs, and the only signal is an uncaught error in the console. Nothing catches it at compile time.

`rootAttributes` binds its attributes to the app's own dispatcher, so they reach `update` unwrapped through any depth of Submodel nesting:

```ts
h.button(
  [h.AriaLabel(label), ...rootAttributes([h.OnClick(ClickedCopy({ text }))])],
  [Icon.copy()],
)
```

It returns the existing `ChildAttribute` type, which element constructors already accept, so nothing else changes. Reach for it only when a Submodel renders app-level chrome it does not own, such as a copy button or an analytics hook. When a Submodel reports something about itself, that is still an OutMessage.
