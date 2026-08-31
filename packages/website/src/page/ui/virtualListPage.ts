import { Submodel } from 'foldkit'
import type { Html } from 'foldkit/html'

import type { RenderCopyButton } from '../../component/codeBlock'
import { slotDocPage } from '../../markdown'
import type { RenderHeadingLink } from '../../prose'
import * as VirtualList from './demo/virtualList'
import type { Message } from './message'
import type { Model } from './model'
import raw from './virtualListPage.md'

const { tableOfContents, view: renderPage } = slotDocPage<'fixed' | 'variable'>(
  raw,
  'ui/virtual-list',
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
        fixed: h.div([], VirtualList.virtualListDemo(model.virtualListDemo, h)),
        variable: h.div(
          [],
          VirtualList.virtualListVariableDemo(model.virtualListVariableDemo, h),
        ),
      },
      renderCopyButton,
      renderHeadingLink,
    }),
)
