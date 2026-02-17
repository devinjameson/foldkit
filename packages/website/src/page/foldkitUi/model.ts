import { Schema as S } from 'effect'
import { Dialog, Disclosure, Tabs } from 'foldkit/ui'

export const Model = S.Struct({
  dialogDemo: Dialog.Model,
  disclosureDemo: Disclosure.Model,
  horizontalTabsDemo: Tabs.Model,
  verticalTabsDemo: Tabs.Model,
})
export type Model = typeof Model.Type
