import { Schema as S } from 'effect'
import { Dialog, Disclosure, Menu, Tabs } from 'foldkit/ui'

export const Model = S.Struct({
  dialogDemo: Dialog.Model,
  disclosureDemo: Disclosure.Model,
  menuBasicDemo: Menu.Model,
  menuAnimatedDemo: Menu.Model,
  horizontalTabsDemo: Tabs.Model,
  verticalTabsDemo: Tabs.Model,
})
export type Model = typeof Model.Type
