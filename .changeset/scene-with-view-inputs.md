---
'foldkit': minor
---

Add `withViewInputs` for testing Submodels that declare `ViewInputs`.

A Submodel view that declares `ViewInputs` has a `(model, viewInputs, h)` signature, which does not match the `(model, h)` shape `scene` takes, so every such test hand-rolled the same wrapper. `withViewInputs(view, defaults)` captures it: `defaults` supplies the full `ViewInputs` once, and the returned factory takes per-test overrides for everything except `toView`, so tests vary value inputs while the renderer stays pinned.

```ts
const sceneView = withViewInputs(Slider.view, {
  value: 5,
  toView: testToView,
})

scene(
  { update, view: sceneView() },
  given(model),
  expect(role('slider')).toHaveAttr('aria-valuenow', '5'),
)

scene(
  { update, view: sceneView({ isDisabled: true }) },
  given(model),
  expect(role('slider')).toHaveAttr('aria-disabled', 'true'),
)
```
