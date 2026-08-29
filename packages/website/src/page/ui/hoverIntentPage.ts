import { Submodel } from 'foldkit'
import type { Html } from 'foldkit/html'

import { slotDocPage } from '../../markdown'
import { type RenderHeadingLink, demoContainer } from '../../prose'
import type { RenderCopyButton } from '../../view/codeBlock'
import * as HoverIntent from './hoverIntent'
import raw from './hoverIntentPage.md'
import type { Message } from './message'
import type { Model } from './model'

const { tableOfContents, view: renderPage } = slotDocPage<'demo'>(
  raw,
  'ui/hover-intent',
)

export { tableOfContents }

type ViewInputs = Readonly<{
  renderCopyButton: RenderCopyButton
  renderHeadingLink: RenderHeadingLink
}>

export const view = Submodel.defineView<Model, Message, ViewInputs>(
  (model, { renderCopyButton, renderHeadingLink }, h): Html =>
    renderPage({
      demos: {
        demo: demoContainer(...HoverIntent.demo(model, h)),
      },
      renderCopyButton,
      renderHeadingLink,
    }),
)
