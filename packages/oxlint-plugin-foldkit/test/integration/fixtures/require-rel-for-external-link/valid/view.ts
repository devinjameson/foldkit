import { staticHtml as h } from 'foldkit/html'

export const docsLink = h.a(
  [
    h.Href('https://example.com'),
    h.Target('_blank'),
    h.Rel('noopener noreferrer'),
  ],
  ['Docs'],
)
