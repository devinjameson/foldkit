import { Schema } from 'effect'
import { Url } from 'foldkit/url'

import { Dialog } from '@foldkit/ui'

import { Deployment } from './deployment'
import { ResolvedTheme, ThemePreference } from './message'
import * as ApiReference from './page/apiReference/model'
import * as ComingFromReact from './page/comingFromReact/model'
import * as ExampleDetail from './page/example/model'
import * as Home from './page/home/model'
import * as Playground from './page/playground'
import * as Ui from './page/ui/model'
import { AppRoute } from './route'
import * as Search from './search/model'
import { SidebarGroups } from './sidebarStorage'

export const Model = Schema.Struct({
  route: AppRoute,
  url: Url,
  deployment: Deployment,
  copiedSnippets: Schema.HashSet(Schema.String),
  maybeGitHubStarCount: Schema.Option(Schema.Number),
  currentYear: Schema.Number,
  mobileMenuDialog: Dialog.Model,
  isMobileTableOfContentsOpen: Schema.Boolean,
  activeSection: Schema.Option(Schema.String),
  isNarrowViewport: Schema.Boolean,
  maybeIsChromium: Schema.Option(Schema.Boolean),
  playground: Schema.Option(Playground.Model),
  sidebarGroups: SidebarGroups,
  isMapMessagesUnderHoodOpen: Schema.Boolean,
  maybeHome: Schema.Option(Home.Model),
  maybeThemePreference: Schema.Option(ThemePreference),
  systemTheme: ResolvedTheme,
  resolvedTheme: ResolvedTheme,
  uiPages: Ui.Model,
  comingFromReact: ComingFromReact.Model,
  apiReference: ApiReference.Model,
  exampleDetail: ExampleDetail.Model,
  search: Search.Model,
})
export type Model = typeof Model.Type
