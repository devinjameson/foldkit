import { Runtime, Ui } from 'foldkit'

import type { Message } from './message'
import type { Model } from './model'

export type InitReturn = [
  Model,
  ReadonlyArray<Runtime.Command<Message>>,
]

export const init = (): InitReturn => [
  {
    horizontalTabsDemo: Ui.Tabs.init({ id: 'horizontal-tabs-demo' }),
    verticalTabsDemo: Ui.Tabs.init({
      id: 'vertical-tabs-demo',
      orientation: 'Vertical',
    }),
  },
  [],
]
