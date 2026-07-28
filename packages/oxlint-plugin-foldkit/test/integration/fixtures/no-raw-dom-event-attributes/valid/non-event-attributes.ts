import { staticHtml as h } from 'foldkit/html'

// `online` and `onLine` are ordinary names, not DOM event handlers.
export const marker = h.div(
  [h.Attribute('online', 'true'), h.Prop({ key: 'onLine', value: true })],
  [],
)
