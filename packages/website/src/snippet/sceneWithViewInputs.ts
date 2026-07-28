import { Scene } from 'foldkit'
import { inertHtml as ih } from 'foldkit/html'

import { Slider } from '@foldkit/ui'

const model = Slider.init({ id: 'volume', min: 0, max: 10, step: 1 })

// Defaults supply the full ViewInputs once. The returned factory produces
// a (model, h) view for Scene.scene, taking per-test overrides for
// everything except toView.
const sceneView = Scene.withViewInputs(Slider.view, {
  value: 5,
  toView: attributes =>
    ih.div(
      [...attributes.root],
      [ih.div([...attributes.track], []), ih.div([...attributes.thumb], [])],
    ),
})

// Vary value inputs per test while the renderer stays pinned.
Scene.scene(
  { update: Slider.update, view: sceneView() },
  Scene.with(model),
  Scene.expect(Scene.role('slider')).toHaveAttr('aria-valuenow', '5'),
)

Scene.scene(
  { update: Slider.update, view: sceneView({ isDisabled: true }) },
  Scene.with(model),
  Scene.expect(Scene.role('slider')).toHaveAttr('aria-disabled', 'true'),
)
