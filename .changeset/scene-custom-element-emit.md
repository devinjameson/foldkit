---
'foldkit': minor
---

Add `Scene.CustomElement.emit` for dispatching declared CustomEvents in a scene.

A CustomElement converts declared CustomEvents into Messages through its `On*` event attributes, and those events had no entry point into a scene: interactions only cover the standard DOM event set. `Scene.CustomElement.emit(spec, target, eventName, detail)` dispatches a declared event on a rendered element, running the same event-to-Message mapping the browser event would. The event name and detail are typed by the spec's event Schemas, and a missing element or missing handler throws.

```ts
Scene.scene(
  { update, view },
  Scene.with(initialModel),
  Scene.CustomElement.emit(
    hexColorPicker,
    Scene.selector('hex-color-picker'),
    'color-changed',
    { value: '#ff0000' },
  ),
  Scene.expect(Scene.role('status')).toHaveText('#ff0000'),
)
```
