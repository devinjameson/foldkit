---
'foldkit': minor
---

Add `Scene.withViewInputs` for testing Submodels that declare `ViewInputs`.

A Submodel view that declares `ViewInputs` has a `(model, viewInputs, h)` signature, which does not match the `(model, h)` shape `Scene.scene` takes, so every such test hand-rolled the same wrapper. `Scene.withViewInputs(view, defaults)` captures it: `defaults` supplies the full `ViewInputs` once, and the returned factory takes per-test overrides for everything except `toView`, so tests vary value inputs while the renderer stays pinned.

```ts
const sceneView = Scene.withViewInputs(Slider.view, {
  value: 5,
  toView: testToView,
})

Scene.scene(
  { update, view: sceneView() },
  Scene.with(model),
  Scene.expect(Scene.role('slider')).toHaveAttr('aria-valuenow', '5'),
)

Scene.scene(
  { update, view: sceneView({ isDisabled: true }) },
  Scene.with(model),
  Scene.expect(Scene.role('slider')).toHaveAttr('aria-disabled', 'true'),
)
```
