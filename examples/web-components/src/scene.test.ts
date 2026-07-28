import { Scene } from 'foldkit'
import { describe, test } from 'vitest'

import { Model, hexColorPicker, update, view } from './main'

const initialModel = Model.make({
  content: 'https://foldkit.dev',
  fillColor: '#1e1b4b',
  backgroundColor: '#fef3c7',
})

describe('view', () => {
  test('initial view shows the page heading and field labels', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.expect(Scene.role('heading', { name: 'QR Designer' })).toExist(),
      Scene.expect(Scene.label('Encoded value')).toExist(),
      Scene.expect(Scene.text('Fill color')).toExist(),
      Scene.expect(Scene.text('Background color')).toExist(),
    )
  })

  test('the encoded-value input reflects the Model content', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.expect(Scene.label('Encoded value')).toHaveValue(
        'https://foldkit.dev',
      ),
    )
  })

  test('typing into the input updates the rendered value', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.type(Scene.label('Encoded value'), 'WIFI:S:Net;P:secret;;'),
      Scene.expect(Scene.label('Encoded value')).toHaveValue(
        'WIFI:S:Net;P:secret;;',
      ),
    )
  })

  test('clicking the first preset swatch updates the fill color hex readout', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.expect(Scene.text('#1E1B4B')).toExist(),
      Scene.click(Scene.role('button', { name: 'Use #0f766e' })),
      Scene.expect(Scene.text('#0F766E')).toExist(),
    )
  })

  test('a color-changed CustomEvent from the fill picker updates the hex readout', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.CustomElement.emit(
        hexColorPicker,
        Scene.selector('#fill-color'),
        'color-changed',
        { value: '#ff8800' },
      ),
      Scene.expect(Scene.text('#FF8800')).toExist(),
    )
  })

  test('a color-changed CustomEvent from the background picker leaves the fill readout alone', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.CustomElement.emit(
        hexColorPicker,
        Scene.selector('#background-color'),
        'color-changed',
        { value: '#222222' },
      ),
      Scene.expect(Scene.text('#222222')).toExist(),
      Scene.expect(Scene.text('#1E1B4B')).toExist(),
    )
  })
})
