import type { Html, HtmlBuilder } from 'foldkit/html'

import { Disclosure } from '@foldkit/ui'

import { Icon } from '../../icon'
import { type Message } from '../../main'
import { slotDocPage } from '../../markdown'
import { ToggledMapMessagesUnderHood } from '../../message'
import { defaultRenderHeadingLink, inlineCode } from '../../prose'
import * as Snippet from '../../snippet'
import {
  type CopiedSnippets,
  type RenderCopyButton,
  defaultRenderCopyButton,
  highlightedCodeBlock,
} from '../../view/codeBlock'
import raw from './submodel.md'

// DEMO

const MAP_MESSAGES_DISCLOSURE_ID = 'submodel-map-messages-disclosure'

/**
 * The one live demo on this page: a disclosure that reveals the
 * `Command.mapMessages` internals. Embedded through the page's
 * `::Demo{name="map-messages-under-hood"}` island, so its open state stays in
 * the app Model (`isMapMessagesUnderHoodOpen`) while the prose lives in markdown.
 */
const mapMessagesUnderHoodDemo = (
  isMapMessagesUnderHoodOpen: boolean,
  renderCopyButton: RenderCopyButton,
  h: HtmlBuilder<Message>,
): Html =>
  Disclosure.view(
    {
      id: MAP_MESSAGES_DISCLOSURE_ID,
      isOpen: isMapMessagesUnderHoodOpen,
      onToggle: isOpen => ToggledMapMessagesUnderHood({ isOpen }),
      toView: attributes =>
        h.div(
          [h.Class('mb-8')],
          [
            h.button(
              [
                ...attributes.button,
                h.Class(
                  'w-full flex items-center justify-between px-4 py-3 text-left text-base font-normal cursor-pointer transition border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white hover:bg-gray-200/50 dark:hover:bg-gray-800 rounded-lg data-[open]:rounded-b-none select-none',
                ),
              ],
              [
                h.span([], ['Under the hood: the Command.mapMessages chain']),
                h.span(
                  [
                    h.Class(
                      `text-gray-600 dark:text-gray-300 transition-transform ${isMapMessagesUnderHoodOpen ? 'rotate-180' : ''}`,
                    ),
                  ],
                  [Icon.chevronDown('w-4 h-4')],
                ),
              ],
            ),
            isMapMessagesUnderHoodOpen
              ? h.div(
                  [
                    ...attributes.panel,
                    h.Class(
                      'px-4 py-3 border-x border-b border-gray-300 dark:border-gray-700 rounded-b-lg text-gray-800 dark:text-gray-200',
                    ),
                  ],
                  [
                    h.div(
                      [h.Class('-mt-8')],
                      [
                        highlightedCodeBlock(
                          h.div([
                            h.Class('text-sm'),
                            h.InnerHTML(
                              Snippet.commandMapMessagesUnderHoodHighlighted,
                            ),
                          ]),
                          Snippet.commandMapMessagesUnderHoodRaw,
                          'Copy snippet to clipboard',
                          renderCopyButton,
                          'mb-4',
                        ),
                      ],
                    ),
                    h.p(
                      [h.Class('leading-relaxed')],
                      [
                        'Two small layers compose into ',
                        inlineCode('mapMessages'),
                        '. ',
                        inlineCode('Array.map'),
                        ' iterates; ',
                        inlineCode('mapMessage'),
                        ' maps each Command’s Effect result through the wrapper (what dispatches in production) and also records the wrapper on the Command. The Command’s ',
                        inlineCode('name'),
                        ' and ',
                        inlineCode('args'),
                        ' ride through untouched, which is why DevTools traces still attribute each Command to its original Submodel. The recorded wrapper keeps the mapping recoverable, so a Story or Scene test resolves a mapped Command with the child’s raw result and never restates the wrapper by hand.',
                      ],
                    ),
                  ],
                )
              : h.empty,
          ],
        ),
    },
    h,
  )

// PAGE

const { tableOfContents, view: renderPage } =
  slotDocPage<'map-messages-under-hood'>(raw, 'core/submodel')

export { tableOfContents }

export const view = (
  copiedSnippets: CopiedSnippets,
  isMapMessagesUnderHoodOpen: boolean,
  h: HtmlBuilder<Message>,
): Html => {
  const renderCopyButton = defaultRenderCopyButton(copiedSnippets, h)

  return renderPage({
    demos: {
      'map-messages-under-hood': mapMessagesUnderHoodDemo(
        isMapMessagesUnderHoodOpen,
        renderCopyButton,
        h,
      ),
    },
    renderCopyButton,
    renderHeadingLink: defaultRenderHeadingLink(h),
  })
}
