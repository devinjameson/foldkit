import { Array } from 'effect'
import { Html } from 'foldkit/html'

import {
  AriaLabel,
  Class,
  Href,
  Id,
  OnClick,
  a,
  code,
  div,
  h1,
  h2,
  h3,
  li,
  p,
  strong,
  ul,
} from './html'
import { Icon } from './icon'
import { CopyLinkToClipboard, TableOfContentsEntry } from './main'

export const link = (href: string, text: string): Html =>
  a(
    [
      Href(href),
      Class('text-blue-500 dark:text-blue-400 hover:underline'),
    ],
    [text],
  )

export const heading = (
  level: 'h1' | 'h2' | 'h3',
  id: string,
  text: string,
): Html => {
  const classes = {
    h1: 'text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6',
    h2: 'text-2xl md:text-2xl font-semibold text-gray-900 dark:text-white mt-8 mb-4 scroll-mt-6',
    h3: 'text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-3 scroll-mt-6',
  }
  const tag = { h1, h2, h3 }

  const headingElement = tag[level](
    [Class(classes[level]), Id(id)],
    [text],
  )

  if (level === 'h1') {
    return headingElement
  }

  const linkButton = a(
    [
      Href(`#${id}`),
      Class(
        'opacity-0 group-hover:opacity-100 transition-opacity absolute -left-8 top-1/2 -translate-y-1/2 p-1 pr-2 rounded hover:text-gray-800 dark:hover:text-gray-200 text-gray-400 dark:text-gray-500 cursor-pointer',
      ),
      AriaLabel(`Copy link to ${text}`),
      OnClick(CopyLinkToClipboard.make({ hash: id })),
    ],
    [Icon.link('w-6 h-6')],
  )

  return div([Class('group relative')], [linkButton, headingElement])
}

export const para = (
  ...content: ReadonlyArray<string | Html>
): Html => p([Class('mb-4 leading-7')], content)

export const paragraphs = (
  ...contents: ReadonlyArray<string>
): ReadonlyArray<Html> =>
  Array.map(contents, (text) => p([Class('mb-4')], [text]))

export const tableOfContentsEntryToHeader = (
  entry: TableOfContentsEntry,
): Html => heading(entry.level, entry.id, entry.text)

export const bullets = (
  ...items: ReadonlyArray<string | Html>
): Html =>
  ul(
    [Class('list-disc mb-8 space-y-2 ml-4')],
    items.map((item) => li([], [item])),
  )

export const bulletPoint = (
  label: string,
  description: string,
): Html => li([], [strong([], [`${label}:`]), ` ${description}`])

export const inlineCode = (text: string): Html =>
  code(
    [
      Class(
        'bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded text-sm',
      ),
    ],
    [text],
  )

export const callout = (
  label: string,
  ...content: ReadonlyArray<string | Html>
): Html =>
  div(
    [
      Class(
        'bg-white dark:bg-gray-800 border-l-4 border-gray-400 dark:border-gray-500 p-4 mb-6 rounded-r-lg',
      ),
    ],
    [
      p(
        [
          Class(
            'font-semibold text-gray-800 dark:text-gray-200 mb-1',
          ),
        ],
        [label],
      ),
      p([Class('text-gray-700 dark:text-gray-300')], content),
    ],
  )
