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
  h4,
  li,
  p,
  strong,
  ul,
} from './html'
import { Icon } from './icon'
import { CopyLinkToClipboard, TableOfContentsEntry } from './main'

export const headingLinkButton = (id: string, text: string): Html =>
  a(
    [
      Href(`#${id}`),
      Class(
        'p-0.5 md:p-1 rounded transition-opacity text-gray-400 dark:text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 focus-visible:text-gray-800 dark:focus-visible:text-gray-200 focus-visible:opacity-100 cursor-pointer hover-capable:opacity-0 hover-capable:group-hover:opacity-100',
      ),
      AriaLabel(`Copy link to ${text}`),
      OnClick(CopyLinkToClipboard({ hash: id })),
    ],
    [Icon.link('w-4 h-4 md:w-5 md:h-5')],
  )

export const link = (href: string, text: string): Html =>
  a(
    [
      Href(href),
      Class('text-blue-500 dark:text-blue-400 hover:underline'),
    ],
    [text],
  )

export const pageTitle = (id: string, text: string): Html =>
  h1(
    [
      Class(
        'text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6',
      ),
      Id(id),
    ],
    [text],
  )

const sectionHeadingConfig = {
  h2: {
    textClassName:
      'text-2xl font-semibold text-gray-900 dark:text-white scroll-mt-6',
    wrapperClassName:
      'group flex items-center gap-1 mt-8 mb-4 md:flex-row-reverse md:justify-end md:-ml-8',
  },
  h3: {
    textClassName:
      'text-lg font-semibold text-gray-900 dark:text-white scroll-mt-6',
    wrapperClassName:
      'group flex items-center gap-1 mt-6 mb-3 md:flex-row-reverse md:justify-end md:-ml-8',
  },
  h4: {
    textClassName:
      'text-base font-mono font-medium text-gray-900 dark:text-white scroll-mt-6',
    wrapperClassName:
      'group flex items-center gap-1 md:flex-row-reverse md:justify-end md:-ml-8',
  },
}

export const heading = (
  level: 'h2' | 'h3' | 'h4',
  id: string,
  text: string,
): Html => {
  const tag = { h2, h3, h4 }
  const config = sectionHeadingConfig[level]

  return div(
    [Class(config.wrapperClassName)],
    [
      tag[level]([Class(config.textClassName), Id(id)], [text]),
      headingLinkButton(id, text),
    ],
  )
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
    Array.map(items, (item) => li([], [item])),
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
