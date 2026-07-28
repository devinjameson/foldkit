import { Schema as S } from 'effect'
import { CustomElement } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { m } from 'foldkit/message'
import 'vanilla-colorful/hex-color-picker.js'

import '@shoelace-style/shoelace/dist/components/qr-code/qr-code.js'

// The two side-effect imports above register each custom element with
// the browser. Foldkit does not call customElements.define for you;
// most third-party packages do it as a side effect on import. If you
// author the class yourself, you call customElements.define once next
// to the class.

// Declare a typed Foldkit binding for each element. Properties become
// PascalCase factories on the builder, events become On{PascalCase}
// factories, all checked against the declared Schema.

const hexColorPicker = CustomElement.define({
  tag: 'hex-color-picker',
  properties: {
    color: S.String,
  },
  events: {
    'color-changed': S.Struct({ value: S.String }),
  },
})

const qrCode = CustomElement.define({
  tag: 'sl-qr-code',
  properties: {
    value: S.String,
    fill: S.String,
    background: S.String,
    size: S.Number,
  },
  events: {},
})

const ChangedFillColor = m('ChangedFillColor', { value: S.String })

const Message = S.Union([ChangedFillColor])
type Message = typeof Message.Type

// Inside a view, mint typed builders with `withMessage(h)`. The view's
// builder fixes the Message universe, so the elements' event factories can
// only produce Messages the surrounding frame dispatches.
//
// Use the builders inline next to standard elements. Property factories
// write JS properties through Snabbdom's propsModule. Event factories
// convert kebab-case CustomEvents into Messages. The picker and the QR
// never talk directly; they share state through the Model.

export const designerView = (
  model: { content: string; fillColor: string },
  h: HtmlBuilder<Message>,
): Html => {
  const fillPicker = hexColorPicker.withMessage(h)
  const qr = qrCode.withMessage(h)

  return h.div(
    [h.Class('flex gap-6')],
    [
      fillPicker([
        fillPicker.Color(model.fillColor),
        fillPicker.OnColorChanged(detail =>
          ChangedFillColor({ value: detail.value }),
        ),
      ]),
      qr([
        qr.Value(model.content),
        qr.Fill(model.fillColor),
        qr.Background('#ffffff'),
        qr.Size(200),
      ]),
    ],
  )
}
