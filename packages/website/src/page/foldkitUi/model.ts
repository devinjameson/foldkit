import { Schema as S } from 'effect'
import { Tabs } from 'foldkit/ui'

export const Model = S.Struct({
  horizontalTabsDemo: Tabs.Model,
  verticalTabsDemo: Tabs.Model,
})
export type Model = typeof Model.Type
