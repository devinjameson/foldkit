import { Submodel } from 'foldkit'
import type { Html } from 'foldkit/html'

import { slotDocPage } from '../../markdown'
import { type RenderHeadingLink, demoContainer } from '../../prose'
import type { RenderCopyButton } from '../../view/codeBlock'
import * as Dialog from './dialog'
import raw from './dialogPage.md'
import type { Message } from './message'
import type { Model } from './model'

const { tableOfContents, view: renderPage } = slotDocPage<
  'dialog' | 'animated' | 'overlay' | 'nested'
>(raw, 'ui/dialog')

export { tableOfContents }

type ViewInputs = Readonly<{
  renderCopyButton: RenderCopyButton
  renderHeadingLink: RenderHeadingLink
}>

export const view = Submodel.defineView<Model, Message, ViewInputs>(
  (model, { renderCopyButton, renderHeadingLink }, h): Html =>
    renderPage({
      demos: {
        dialog: demoContainer(...Dialog.dialogDemo(model.dialogDemo, h)),
        animated: demoContainer(
          ...Dialog.dialogAnimatedDemo(model.dialogAnimatedDemo, h),
        ),
        overlay: demoContainer(
          ...Dialog.overlayDialogDemo(
            model.overlayDialogDemo,
            model.overlayComboboxDemo,
            model.maybeOverlayComboboxDemoSelectedCity,
            h,
          ),
        ),
        nested: demoContainer(
          ...Dialog.nestedDialogDemo(
            model.nestedDialogParentDemo,
            model.nestedDialogChildDemo,
            h,
          ),
        ),
      },
      renderCopyButton,
      renderHeadingLink,
    }),
)
