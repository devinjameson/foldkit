import { Submodel } from 'foldkit'
import type { Html } from 'foldkit/html'

import { slotDocPage } from '../../markdown'
import { type RenderHeadingLink, demoContainer } from '../../prose'
import type { RenderCopyButton } from '../../view/codeBlock'
import type { Message } from './message'
import type { Model } from './model'
import * as Slider from './slider'
import raw from './sliderPage.md'

const { tableOfContents, view: renderPage } = slotDocPage<'slider'>(
  raw,
  'ui/slider',
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
        slider: demoContainer(
          ...Slider.sliderDemo(
            {
              ratingModel: model.sliderRatingDemo,
              ratingValue: model.sliderRatingValue,
              volumeModel: model.sliderVolumeDemo,
              volumeValue: model.sliderVolumeValue,
            },
            h,
          ),
        ),
      },
      renderCopyButton,
      renderHeadingLink,
    }),
)
