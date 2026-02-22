import type { Command } from 'foldkit'
import { Ui } from 'foldkit'

import type { Message } from './message'
import type { Model } from './model'

export type InitReturn = [Model, ReadonlyArray<Command<Message>>]

export const init = (): InitReturn => [
  {
    dialogDemo: Ui.Dialog.init({ id: 'dialog-demo' }),
    disclosureDemo: Ui.Disclosure.init({ id: 'disclosure-demo' }),
    menuBasicDemo: Ui.Menu.init({ id: 'menu-basic-demo' }),
    menuAnimatedDemo: Ui.Menu.init({
      id: 'menu-animated-demo',
      isAnimated: true,
    }),
    horizontalTabsDemo: Ui.Tabs.init({ id: 'horizontal-tabs-demo' }),
    verticalTabsDemo: Ui.Tabs.init({
      id: 'vertical-tabs-demo',
      orientation: 'Vertical',
    }),
  },
  [],
]
