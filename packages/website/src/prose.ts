import { Array } from 'effect'
import { Html, type HtmlBuilder, inertHtml as ih } from 'foldkit/html'
import { twMerge } from 'tailwind-merge'

import { Icon } from './icon'
import { type TableOfContentsEntry } from './main'
import { ClickedCopyLink, type Message } from './message'

/**
 * Builds the copy-link control beside a section heading.
 *
 * A page rendered through `h.submodel` must supply one of these from its
 * parent, for the same reason {@link RenderCopyButton} exists: a handler's
 * dispatcher comes from the frame it is built in, so an app-level Message
 * built inside a Submodel's view is rejected by that Submodel's boundary.
 */
export type RenderHeadingLink = (id: string, text: string) => Html

const headingLinkButton = (
  id: string,
  text: string,
  h: HtmlBuilder<Message>,
): Html =>
  h.a(
    [
      h.Href(`#${id}`),
      h.Class(
        'px-0.5 py-1 rounded transition-opacity text-gray-400 dark:text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 focus-visible:text-gray-800 dark:focus-visible:text-gray-200 focus-visible:opacity-100 cursor-pointer hover-capable:opacity-0 hover-capable:group-hover:opacity-100',
      ),
      h.AriaLabel(`Copy link to ${text}`),
      h.OnClick(ClickedCopyLink({ hash: id })),
    ],
    [Icon.link('w-5 h-5')],
  )

/**
 * Builds a copy-link control bound to the root frame's builder.
 *
 * This is the only way to construct a {@link RenderHeadingLink}, and it demands
 * a builder typed to the app's Message. A Submodel's own builder cannot satisfy
 * it, which is what forces the control to be created by an ancestor and passed
 * down rather than built in place.
 */
export const defaultRenderHeadingLink =
  (h: HtmlBuilder<Message>): RenderHeadingLink =>
  (id, text) =>
    headingLinkButton(id, text, h)

export const link = (href: string, text: string): Html =>
  ih.a(
    [
      ih.Href(href),
      ih.Class(
        'text-accent-600 dark:text-accent-500 underline decoration-accent-600/30 dark:decoration-accent-500/30 hover:decoration-accent-600 dark:hover:decoration-accent-500 font-normal',
      ),
    ],
    [text],
  )

export const pageTitle = (id: string, text: string): Html =>
  ih.h1(
    [
      ih.Class(
        'text-3xl md:text-[2.5rem] leading-normal font-normal text-gray-900 dark:text-white mb-4',
      ),
      ih.Id(id),
      ih.DataAttribute('pagefind-meta', 'section'),
    ],
    [text],
  )

const sectionHeadingConfig = {
  h2: {
    textClassName:
      'text-2xl md:text-3xl font-normal text-gray-900 dark:text-white scroll-mt-6',
    wrapperClassName:
      'group flex items-center gap-1 md:hover-capable:gap-0 mt-8 mb-4 md:hover-capable:flex-row-reverse md:hover-capable:justify-end md:hover-capable:-ml-[1.5rem]',
  },
  h3: {
    textClassName:
      'text-xl font-normal text-gray-900 dark:text-white scroll-mt-6',
    wrapperClassName:
      'group flex items-center gap-1 md:hover-capable:gap-0 mt-6 mb-2 md:hover-capable:flex-row-reverse md:hover-capable:justify-end md:hover-capable:-ml-[1.5rem]',
  },
  h4: {
    textClassName:
      'text-base font-mono font-normal text-gray-900 dark:text-white scroll-mt-6',
    wrapperClassName:
      'group flex items-center gap-1 md:hover-capable:gap-0 md:hover-capable:flex-row-reverse md:hover-capable:justify-end md:hover-capable:-ml-[1.5rem]',
  },
  h5: {
    textClassName:
      'text-sm font-mono font-normal text-gray-900 dark:text-white scroll-mt-6',
    wrapperClassName:
      'group flex items-center gap-1 md:hover-capable:gap-0 md:hover-capable:flex-row-reverse md:hover-capable:justify-end md:hover-capable:-ml-[1.5rem]',
  },
  h6: {
    textClassName:
      'text-sm font-mono font-normal text-gray-500 dark:text-gray-400 scroll-mt-6',
    wrapperClassName:
      'group flex items-center gap-1 md:hover-capable:gap-0 md:hover-capable:flex-row-reverse md:hover-capable:justify-end md:hover-capable:-ml-[1.5rem]',
  },
}

/**
 * Renders a linkable section heading (`h2` through `h6`) with the hover anchor
 * button. `ariaText` labels the copy-link control; `content` is the heading's
 * rendered inline content, so a heading may carry inline code or emphasis.
 */
export const headingWithContent = (
  level: 'h2' | 'h3' | 'h4' | 'h5' | 'h6',
  id: string,
  ariaText: string,
  content: ReadonlyArray<string | Html>,
  renderHeadingLink: RenderHeadingLink,
): Html => {
  const tag = { h2: ih.h2, h3: ih.h3, h4: ih.h4, h5: ih.h5, h6: ih.h6 }
  const config = sectionHeadingConfig[level]

  return ih.div(
    [ih.Class(config.wrapperClassName)],
    [
      tag[level]([ih.Class(config.textClassName), ih.Id(id)], content),
      renderHeadingLink(id, ariaText),
    ],
  )
}

export const para = (...content: ReadonlyArray<string | Html>): Html =>
  ih.p([ih.Class('mb-4 leading-relaxed')], content)

export const subPara = (...content: ReadonlyArray<string | Html>): Html =>
  ih.p(
    [ih.Class('mb-4 text-sm leading-6 text-gray-800 dark:text-gray-400')],
    content,
  )

/**
 * The heading helpers bound to a page-supplied copy-link renderer, for a page
 * rendered inside a Submodel. Bind once at the top of the view and the call
 * sites below it are unchanged.
 */
export const headingsFor = (renderHeadingLink: RenderHeadingLink) => ({
  heading: (level: 'h2' | 'h3' | 'h4', id: string, text: string): Html =>
    headingWithContent(level, id, text, [text], renderHeadingLink),
  tableOfContentsEntryToHeader: (entry: TableOfContentsEntry): Html =>
    headingWithContent(
      entry.level,
      entry.id,
      entry.text,
      [entry.text],
      renderHeadingLink,
    ),
})

export const bullets = (...items: ReadonlyArray<string | Html>): Html =>
  ih.ul(
    [ih.Class('list-disc mb-8 space-y-2')],
    Array.map(items, item => ih.li([], [item])),
  )

export const bulletPoint = (label: string, description: string): Html =>
  ih.span([], [ih.strong([], [`${label}:`]), ` ${description}`])

const inlineCodeClassName =
  'bg-gray-200/70 dark:bg-gray-800 px-1 py-px rounded text-sm border border-gray-300/50 dark:border-gray-700/50'

export const inlineCode = (text: string, className?: string): Html =>
  ih.code([ih.Class(twMerge(inlineCodeClassName, className))], [text])

export const infoCallout = (
  label: string,
  ...content: ReadonlyArray<string | Html>
): Html =>
  ih.div(
    [
      ih.Class(
        'border border-gray-300 dark:border-gray-700 bg-gray-200/40 dark:bg-gray-800/40 py-3.5 px-5 mb-6 rounded-lg',
      ),
    ],
    [
      ih.p(
        [
          ih.Class(
            'flex items-center gap-1.5 font-semibold text-gray-800 dark:text-gray-200 mb-1',
          ),
        ],
        [Icon.informationCircle('w-5 h-5 shrink-0'), ih.span([], [label])],
      ),
      ih.p([ih.Class('text-gray-700 dark:text-gray-300 leading-7')], content),
    ],
  )

export const demoContainer = (...content: ReadonlyArray<Html>): Html =>
  ih.div(
    [
      ih.Class(
        'rounded-xl border border-gray-200 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/20 p-8 mb-6 flex flex-col items-center',
      ),
    ],
    content,
  )

export const warningCallout = (
  label: string,
  ...content: ReadonlyArray<string | Html>
): Html =>
  ih.div(
    [
      ih.Class(
        'border border-amber-400 dark:border-amber-500/50 py-3.5 px-5 mb-6 rounded-lg',
      ),
    ],
    [
      ih.p(
        [
          ih.Class(
            'flex items-center gap-1.5 font-semibold text-amber-900 dark:text-amber-200 mb-1',
          ),
        ],
        [Icon.exclamationTriangle('w-5 h-5 shrink-0'), ih.span([], [label])],
      ),
      ih.p([ih.Class('text-gray-700 dark:text-gray-300 leading-7')], content),
    ],
  )

const calloutBlocks = (
  config: Readonly<{
    borderClassName: string
    labelClassName: string
    icon: Html
    label: string
    blocks: ReadonlyArray<Html>
  }>,
): Html =>
  ih.div(
    [ih.Class(`border ${config.borderClassName} py-3.5 px-5 mb-6 rounded-lg`)],
    [
      ih.p(
        [
          ih.Class(
            `flex items-center gap-1.5 font-semibold ${config.labelClassName} mb-1`,
          ),
        ],
        [config.icon, ih.span([], [config.label])],
      ),
      ih.div(
        [
          ih.Class(
            'text-gray-700 dark:text-gray-300 [&>p]:leading-7 [&>p:last-child]:mb-0',
          ),
        ],
        config.blocks,
      ),
    ],
  )

/**
 * An informational callout wrapping block content (paragraphs, lists, code
 * blocks). The `:::Info` markdown island renders through this.
 */
export const infoCalloutBlocks = (
  label: string,
  blocks: ReadonlyArray<Html>,
): Html =>
  calloutBlocks({
    borderClassName:
      'border-gray-300 dark:border-gray-700 bg-gray-200/40 dark:bg-gray-800/40',
    labelClassName: 'text-gray-800 dark:text-gray-200',
    icon: Icon.informationCircle('w-5 h-5 shrink-0'),
    label,
    blocks,
  })

/**
 * A cautionary callout wrapping block content. The `:::Warning` markdown island
 * renders through this.
 */
export const warningCalloutBlocks = (
  label: string,
  blocks: ReadonlyArray<Html>,
): Html =>
  calloutBlocks({
    borderClassName: 'border-amber-400 dark:border-amber-500/50',
    labelClassName: 'text-amber-900 dark:text-amber-200',
    icon: Icon.exclamationTriangle('w-5 h-5 shrink-0'),
    label,
    blocks,
  })

/**
 * A centered, monospaced figure for ASCII diagrams. The `diagram` fenced code
 * block in markdown renders through this. It carries no copy affordance because
 * the content is a picture, not code to lift.
 */
export const diagram = (content: string): Html =>
  ih.pre(
    [
      ih.Class(
        'mb-4 mx-auto w-fit max-w-full text-[#403d4a] dark:text-[#E0DEE6] text-sm p-4 overflow-x-auto rounded-lg bg-gray-100 dark:bg-[#1c1a20] border border-gray-200 dark:border-gray-700/50',
      ),
    ],
    [content],
  )

/**
 * A wrapping row of call-to-action links. The `:::Cta` markdown island renders
 * its link paragraphs through this, laying them out as a row and lifting the
 * links to medium weight.
 */
export const ctaLinks = (blocks: ReadonlyArray<Html>): Html =>
  ih.div(
    [
      ih.Class(
        'mb-8 flex flex-wrap gap-x-6 gap-y-2 [&>p]:m-0 [&_a]:font-medium',
      ),
    ],
    blocks,
  )
