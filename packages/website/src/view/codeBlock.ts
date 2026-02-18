import classNames from 'classnames'
import { HashSet } from 'effect'
import { Html } from 'foldkit/html'

import {
  AriaLabel,
  Class,
  OnClick,
  button,
  div,
  empty,
  pre,
} from '../html'
import { Icon } from '../icon'
import { CopySnippetToClipboard, type Model } from '../main'

const copyButtonWithIndicator = (
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
            'absolute bottom-full left-1/2 -translate-x-1/2 mb-1 text-sm rounded py-1 px-2 font-medium bg-green-700 text-white whitespace-nowrap',
          ),
        ],
        ['Copied'],
      )
    : empty

  const copyButton = button(
    [
      Class(
        'p-2 rounded transition bg-gray-800 dark:bg-gray-700 text-gray-400 hover:text-white hover:bg-gray-700 dark:hover:bg-gray-600',
      ),
      AriaLabel(ariaLabel),
      OnClick(CopySnippetToClipboard({ text: textToCopy })),
    ],
    [Icon.copy()],
  )

  return div(
    [Class('absolute top-2 right-2')],
    [copiedIndicator, copyButton],
  )
}

export const codeBlock = (
  code: string,
  ariaLabel: string,
  model: Model,
  className?: string,
) => {
  const content = pre(
    [
      Class(
        'bg-[#24292e] text-[#e1e4e8] rounded-lg text-sm p-4 pr-14 overflow-x-auto',
      ),
    ],
    [code],
  )

  return div(
    [Class(classNames('relative min-w-0', className))],
    [content, copyButtonWithIndicator(code, ariaLabel, model)],
  )
}

export const highlightedCodeBlock = (
  content: Html,
  rawCode: string,
  ariaLabel: string,
  model: Model,
  className?: string,
) =>
  div(
    [Class(classNames('relative min-w-0', className))],
    [content, copyButtonWithIndicator(rawCode, ariaLabel, model)],
  )
