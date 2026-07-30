import { Submodel } from 'foldkit'
import type { Html } from 'foldkit/html'

import { slotDocPage } from '../../markdown'
import { type RenderHeadingLink, demoContainer } from '../../prose'
import type { RenderCopyButton } from '../../view/codeBlock'
import * as Combobox from './combobox'
import raw from './comboboxPage.md'
import type { Message } from './message'
import type { Model } from './model'

const { tableOfContents, view: renderPage } = slotDocPage<
  | 'single-select'
  | 'nullable'
  | 'select-on-focus'
  | 'locked-placement'
  | 'multi'
>(raw, 'ui/combobox')

export { tableOfContents }

type ViewInputs = Readonly<{
  renderCopyButton: RenderCopyButton
  renderHeadingLink: RenderHeadingLink
}>

export const view = Submodel.defineView<Model, Message, ViewInputs>(
  (model, { renderCopyButton, renderHeadingLink }, h): Html =>
    renderPage({
      demos: {
        'single-select': h.section(
          [h.AriaLabelledBy(Combobox.singleSelectHeader.id)],
          [
            demoContainer(
              ...Combobox.comboboxDemo(
                model.comboboxDemo,
                model.maybeComboboxDemoSelectedCity,
                h,
              ),
            ),
          ],
        ),
        nullable: h.section(
          [h.AriaLabelledBy(Combobox.nullableHeader.id)],
          [
            demoContainer(
              ...Combobox.nullableDemo(
                model.comboboxNullableDemo,
                model.maybeComboboxNullableDemoSelectedCity,
                h,
              ),
            ),
          ],
        ),
        'select-on-focus': h.section(
          [h.AriaLabelledBy(Combobox.selectOnFocusHeader.id)],
          [
            demoContainer(
              ...Combobox.selectOnFocusDemo(
                model.comboboxSelectOnFocusDemo,
                model.maybeComboboxSelectOnFocusDemoSelectedCity,
                h,
              ),
            ),
          ],
        ),
        'locked-placement': h.section(
          [h.AriaLabelledBy(Combobox.placementLockHeader.id)],
          [
            demoContainer(
              ...Combobox.placementLockDemo(
                model.comboboxPlacementLockDemo,
                model.maybeComboboxPlacementLockDemoSelectedCity,
                h,
              ),
            ),
          ],
        ),
        multi: h.section(
          [h.AriaLabelledBy(Combobox.multiHeader.id)],
          [
            demoContainer(
              ...Combobox.multiDemo(
                model.comboboxMultiDemo,
                model.comboboxMultiDemoSelectedCities,
                h,
              ),
            ),
          ],
        ),
      },
      renderCopyButton,
      renderHeadingLink,
    }),
)
