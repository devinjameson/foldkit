import { staticHtml as h } from 'foldkit/html'

export const reloadButton = h.button(
  [h.Attribute('onclick', 'location.reload()')],
  ['Reload'],
)
