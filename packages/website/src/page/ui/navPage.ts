import { Submodel } from 'foldkit'
import type { Html } from 'foldkit/html'
import type { Url } from 'foldkit/url'

import { slotDocPage } from '../../markdown'
import { type RenderHeadingLink, demoContainer } from '../../prose'
import type { RenderCopyButton } from '../../view/codeBlock'
import type { Message } from './message'
import type { Model } from './model'
import * as Nav from './nav'
import raw from './navPage.md'

const { tableOfContents, view: renderPage } = slotDocPage<'basic'>(
  raw,
  'ui/nav',
)

export { tableOfContents }

type ViewInputs = Readonly<{
  renderCopyButton: RenderCopyButton
  renderHeadingLink: RenderHeadingLink
  url: Url
}>

export const view = Submodel.defineView<Model, Message, ViewInputs>(
  (_model, { renderCopyButton, renderHeadingLink, url }, h): Html =>
    renderPage({
      demos: {
        basic: demoContainer(...Nav.basicDemo(url, h)),
      },
      renderCopyButton,
      renderHeadingLink,
    }),
)
