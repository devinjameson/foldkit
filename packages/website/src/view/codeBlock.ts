import { clsx } from 'clsx'
import { HashSet } from 'effect'
import { Html, type HtmlBuilder, inertHtml as ih } from 'foldkit/html'

import { Icon } from '../icon'
import { ClickedCopySnippet, type Message } from '../message'

const PagefindIgnore = ih.DataAttribute('pagefind-ignore', '')

export type CopiedSnippets = HashSet.HashSet<string>

/**
 * Builds the copy control for a code block.
 *
 * A page rendered through `h.submodel` must supply one of these from its
 * parent, because a handler's dispatcher is chosen by where the element is
 * built. Left to build itself inside a Submodel's view, the button's app-level
 * Message meets that Submodel's `toParentMessage` and is rejected.
 */
export type RenderCopyButton = (
  textToCopy: string,
  ariaLabel: string,
  positionClass: string,
) => Html

const copyButtonWithIndicator = (
  textToCopy: string,
  ariaLabel: string,
  copiedSnippets: CopiedSnippets,
  positionClass: string,
  h: HtmlBuilder<Message>,
) => {
  const isCopied = HashSet.has(copiedSnippets, textToCopy)

  const copiedIndicator = isCopied
    ? h.div(
        [
          h.Class(
            'absolute bottom-full left-1/2 -translate-x-1/2 mb-1 text-sm rounded py-1 px-2 font-normal bg-accent-600 dark:bg-accent-500 text-white dark:text-accent-900 whitespace-nowrap',
          ),
        ],
        ['Copied'],
      )
    : h.empty

  const liveAnnouncement = h.span(
    [h.Role('status'), h.AriaLive('polite'), h.Class('sr-only')],
    [isCopied ? 'Copied to clipboard' : ''],
  )

  const copyButton = h.button(
    [
      h.Class(
        'p-2 rounded transition cursor-pointer border border-gray-300 dark:border-gray-700/50 bg-gray-100 dark:bg-[#1c1a20] text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700/30',
      ),
      h.AriaLabel(ariaLabel),
      h.OnClick(ClickedCopySnippet({ text: textToCopy })),
    ],
    [Icon.copy()],
  )

  return h.div(
    [h.Class(clsx('code-embed-copy absolute', positionClass))],
    [copiedIndicator, liveAnnouncement, copyButton],
  )
}

/**
 * Builds a copy control bound to the root frame's builder.
 *
 * This is the only way to construct a {@link RenderCopyButton}, and it demands
 * a builder typed to the app's Message. A Submodel's own builder cannot satisfy
 * it, which is what forces the control to be created by an ancestor and passed
 * down rather than built in place.
 */
export const defaultRenderCopyButton =
  (copiedSnippets: CopiedSnippets, h: HtmlBuilder<Message>): RenderCopyButton =>
  (textToCopy, ariaLabel, positionClass) =>
    copyButtonWithIndicator(
      textToCopy,
      ariaLabel,
      copiedSnippets,
      positionClass,
      h,
    )

export const codeBlock = (
  code: string,
  ariaLabel: string,
  renderCopyButton: RenderCopyButton,
  className?: string,
  language?: string,
) => {
  const languageAttribute =
    language === undefined ? [] : [ih.DataAttribute('language', language)]

  const content = ih.pre(
    [
      ...languageAttribute,
      ih.Class(
        'text-[#403d4a] dark:text-[#E0DEE6] text-sm p-4 pr-14 overflow-x-auto !rounded-none !border-none',
      ),
    ],
    [code],
  )

  return ih.div(
    [
      PagefindIgnore,
      ih.Class(
        clsx(
          'relative min-w-0 rounded-lg bg-gray-100 dark:bg-[#1c1a20] border border-gray-200 dark:border-gray-700/50',
          className,
        ),
      ),
    ],
    [content, renderCopyButton(code, ariaLabel, 'top-2 right-2')],
  )
}

export const highlightedCodeBlock = (
  content: Html,
  rawCode: string,
  ariaLabel: string,
  renderCopyButton: RenderCopyButton,
  className?: string,
) =>
  ih.div(
    [PagefindIgnore, ih.Class(clsx('relative min-w-0 mt-8', className))],
    [content, renderCopyButton(rawCode, ariaLabel, 'top-2 right-2')],
  )

/**
 * `highlightedCodeBlock` bound to a page-supplied copy-button renderer, for a
 * page rendered inside a Submodel. Bind once at the top of the view and the
 * call sites below it are unchanged.
 */
export const highlightedCodeBlockFor =
  (renderCopyButton: RenderCopyButton) =>
  (
    content: Html,
    rawCode: string,
    ariaLabel: string,
    className?: string,
  ): Html =>
    highlightedCodeBlock(
      content,
      rawCode,
      ariaLabel,
      renderCopyButton,
      className,
    )
