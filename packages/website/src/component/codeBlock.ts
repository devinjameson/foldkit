import { clsx } from 'clsx'
import { Html, inertHtml as ih } from 'foldkit/html'

const PagefindIgnore = ih.DataAttribute('pagefind-ignore', '')

export type RenderCopyButton = (
  config: Readonly<{
    id: string
    text: string
    ariaLabel: string
    positionClass: string
  }>,
) => Html

export const view = (
  id: string,
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
      ih.Class('text-sm p-4 pr-14 overflow-x-auto !rounded-none !border-none'),
    ],
    [code],
  )

  return ih.div(
    [
      PagefindIgnore,
      ih.Class(
        clsx(
          'code-surface relative min-w-0 rounded-lg border border-gray-200 dark:border-gray-700/50',
          className,
        ),
      ),
    ],
    [
      content,
      renderCopyButton({
        id,
        text: code,
        ariaLabel,
        positionClass: 'top-2 right-2',
      }),
    ],
  )
}

export const highlightedView = (
  id: string,
  content: Html,
  rawCode: string,
  ariaLabel: string,
  renderCopyButton: RenderCopyButton,
  className?: string,
) =>
  ih.div(
    [PagefindIgnore, ih.Class(clsx('relative min-w-0 mt-8', className))],
    [
      content,
      renderCopyButton({
        id,
        text: rawCode,
        ariaLabel,
        positionClass: 'top-2 right-2',
      }),
    ],
  )

/**
 * `highlightedView` bound to a page-supplied copy-button renderer, for a
 * page rendered inside a Submodel. Bind once at the top of the view and the
 * call sites below it are unchanged.
 */
export const highlightedViewFor =
  (renderCopyButton: RenderCopyButton) =>
  (
    id: string,
    content: Html,
    rawCode: string,
    ariaLabel: string,
    className?: string,
  ): Html =>
    highlightedView(
      id,
      content,
      rawCode,
      ariaLabel,
      renderCopyButton,
      className,
    )
