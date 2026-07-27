// view/copyButton.ts
import { type Html, html, rootAttributes } from 'foldkit/html'

import { ClickedCopySnippet, type Message } from '../message'

// Shared chrome, rendered on plain pages and inside Submodel doc pages alike.
export const copyButton = (text: string, label: string): Html => {
  const h = html<Message>()

  return h.button(
    [
      h.Class('absolute top-2 right-2 rounded p-2'),
      h.AriaLabel(`Copy ${label} to clipboard`),
      ...rootAttributes([h.OnClick(ClickedCopySnippet({ text }))]),
    ],
    ['Copy'],
  )
}
