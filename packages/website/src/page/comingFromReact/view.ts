import { Option, Record } from 'effect'
import { Submodel } from 'foldkit'
import { Html, type HtmlBuilder, inertHtml as ih } from 'foldkit/html'

import { Disclosure } from '@foldkit/ui'

import { Icon } from '../../icon'
import { slotDocPage } from '../../markdown'
import { type RenderHeadingLink } from '../../prose'
import { type RenderCopyButton } from '../../view/codeBlock'
import raw from './comingFromReact.md'
import { type Message, ToggledFaq } from './message'
import type { Model } from './model'

// FAQ SHELL

const chevron = (isOpen: boolean): Html =>
  ih.span(
    [
      ih.Class(
        `text-gray-600 dark:text-gray-300 transition-transform ${isOpen ? 'rotate-180' : ''}`,
      ),
    ],
    [Icon.chevronDown('w-4 h-4')],
  )

const faqButtonClassName =
  'w-full flex items-center justify-between px-4 py-3 text-left text-base font-normal cursor-pointer transition border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white hover:bg-gray-200/50 dark:hover:bg-gray-800 rounded-lg data-[open]:rounded-b-none select-none'

const faqPanelClassName =
  'px-4 py-3 border-x border-b border-gray-300 dark:border-gray-700 rounded-b-lg text-gray-800 dark:text-gray-200 [&_p]:mb-2 [&_p]:last:mb-0 [&_p]:leading-normal'

/**
 * The collapsible shell around one `:::Faq` island's answer. Supplied to the
 * markdown renderer rather than called directly, because the open state lives in
 * this page's Model and the toggle produces this page's Message.
 */
const faqItem = (
  id: string,
  question: string,
  answerContent: ReadonlyArray<Html>,
  model: Model,
  h: HtmlBuilder<Message>,
): Html =>
  Option.match(Record.get(model, id), {
    onSome: isFaqOpen =>
      Disclosure.view(
        {
          id,
          isOpen: isFaqOpen,
          onToggle: isOpen => ToggledFaq({ id, isOpen }),
          toView: attributes =>
            h.div(
              [h.Class('mb-2')],
              [
                h.button(
                  [...attributes.button, h.Class(faqButtonClassName)],
                  [
                    h.div(
                      [h.Class('flex items-center justify-between w-full')],
                      [h.span([], [question]), chevron(isFaqOpen)],
                    ),
                  ],
                ),
                isFaqOpen
                  ? h.div(
                      [...attributes.panel, h.Class(faqPanelClassName)],
                      [h.div([], answerContent)],
                    )
                  : h.empty,
              ],
            ),
        },
        h,
      ),
    onNone: () =>
      h.div([], [h.p([h.Class('font-bold')], [question]), ...answerContent]),
  })

// PAGE

const { tableOfContents, view: renderPage } = slotDocPage(
  raw,
  'coming-from-react',
)

export { tableOfContents }

// NOTE: `renderCopyButton` and `renderHeadingLink` arrive as slot callbacks
// rather than being built here. Both dispatch app-level Messages, and a handler
// built inside this Submodel's view would be lifted by its `toParentMessage`
// and rejected. As top-level `viewInputs` functions they run in the parent's
// boundary instead.
type ViewInputs = Readonly<{
  renderCopyButton: RenderCopyButton
  renderHeadingLink: RenderHeadingLink
}>

export const view = Submodel.defineView<Model, Message, ViewInputs>(
  (model, { renderCopyButton, renderHeadingLink }, h): Html =>
    renderPage({
      demos: {},
      renderFaq: (id, question, content) =>
        faqItem(id, question, content, model, h),
      renderCopyButton,
      renderHeadingLink,
    }),
)
