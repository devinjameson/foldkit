import classNames from 'classnames'
import { HashSet } from 'effect'
import { Html } from 'foldkit/html'

import {
  AriaLabel,
  AriaLive,
  Class,
  OnClick,
  Role,
  button,
  div,
  empty,
  pre,
  span,
} from '../html'
import { Icon } from '../icon'
import { ClickedCopySnippet, type Model } from '../main'

const copyButtonWithIndicator = (
  textToCopy: string,
  ariaLabel: string,
  model: Model,
) => {
  const isCopied = HashSet.has(model.copiedSnippets, textToCopy)

  const copiedIndicator = isCopied
    ? div(
        [
          Class(
            'absolute bottom-full left-1/2 -translate-x-1/2 mb-1 text-sm rounded py-1 px-2 font-medium bg-pink-600 dark:bg-pink-500 text-white whitespace-nowrap',
          ),
        ],
        ['Copied'],
      )
    : empty

  const liveAnnouncement = span(
    [Role('status'), AriaLive('polite'), Class('sr-only')],
    [isCopied ? 'Copied to clipboard' : ''],
  )

  const copyButton = button(
    [
      Class(
        'p-2 rounded transition cursor-pointer bg-gray-800 dark:bg-gray-700 text-gray-400 hover:text-white hover:bg-gray-700 dark:hover:bg-gray-600',
      ),
      AriaLabel(ariaLabel),
      OnClick(ClickedCopySnippet({ text: textToCopy })),
    ],
    [Icon.copy()],
  )

  return div(
    [Class('absolute top-2 right-2')],
    [copiedIndicator, liveAnnouncement, copyButton],
  )
}

export const codeBlock = (
  code: string,
  ariaLabel: string,
  model: Model,
  className?: string,
) => {
  const content = pre(
    [Class('text-[#e1e4e8] text-sm p-4 pr-14 overflow-x-auto')],
    [code],
  )

  return div(
    [
      Class(
        classNames(
          'relative min-w-0 bg-[#24292e] rounded-lg',
          className,
        ),
      ),
    ],
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
