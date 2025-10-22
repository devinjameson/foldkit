import { HashSet } from 'effect'
import {
  AriaLabel,
  Class,
  Html,
  OnClick,
  button,
  div,
  empty,
} from 'foldkit/html'

import { Icon } from '../icon'
import { CopySnippetToClipboard, type Model } from '../main'

export const codeBlock = (
  content: Html,
  textToCopy: string,
  ariaLabel: string,
  model: Model,
) => {
  const copiedIndicator = HashSet.has(
    model.copiedSnippets,
    textToCopy,
  )
    ? div(
        [
          Class(
            'text-sm rounded py-1 px-2 font-medium bg-green-700 text-white',
          ),
        ],
        ['Copied'],
      )
    : empty

  const copyButton = button(
    [
      Class(
        'p-2 rounded hover:bg-gray-700 transition text-gray-400 hover:text-white bg-gray-800',
      ),
      AriaLabel(ariaLabel),
      OnClick(CopySnippetToClipboard.make({ text: textToCopy })),
    ],
    [Icon.copy()],
  )

  const copyButtonWithIndicator = div(
    [Class('absolute top-2 right-2 flex items-center gap-2')],
    [copiedIndicator, copyButton],
  )

  return div(
    [Class('relative mb-8 min-w-0')],
    [content, copyButtonWithIndicator],
  )
}
