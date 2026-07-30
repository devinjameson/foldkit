import { Schema as S } from 'effect'
import { CustomElement, Scene } from 'foldkit'

const hexColorPicker = CustomElement.define({
  tag: 'hex-color-picker',
  properties: {
    color: S.String,
  },
  events: {
    'color-changed': S.Struct({ value: S.String }),
  },
})

// Dispatches a CustomEvent the element's spec declares. The event name and
// detail are typed by the spec's event Schemas, and the element's
// OnColorChanged mapping converts the detail into a Message.
Scene.CustomElement.emit(
  hexColorPicker,
  Scene.selector('hex-color-picker'),
  'color-changed',
  { value: '#ff0000' },
)
Scene.expect(Scene.role('status')).toHaveText('#ff0000')
