import { Schema as S } from 'effect'
import { Disclosure, Tabs } from 'foldkit/ui'

export const Model = S.Struct({
  disclosureDemo: Disclosure.Model,
  horizontalTabsDemo: Tabs.Model,
  verticalTabsDemo: Tabs.Model,
})
export type Model = typeof Model.Type
