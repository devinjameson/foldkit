import { Schema } from 'effect'
import { Calendar } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { UrlRequest } from 'foldkit/navigation'
import { Url } from 'foldkit/url'

import { Dialog } from '@foldkit/ui'

import * as ApiReference from './page/apiReference/message'
import * as ComingFromReact from './page/comingFromReact/message'
import * as ExampleDetail from './page/example/message'
import * as Home from './page/home/message'
import * as Playground from './page/playground'
import * as Ui from './page/ui/message'
import * as Search from './search/message'
import { GroupKey, SidebarState } from './sidebarStorage'

// THEME

export const ThemePreference = Schema.Literals(['Dark', 'Light', 'System'])
export type ThemePreference = typeof ThemePreference.Type

export const ResolvedTheme = Schema.Literals(['Dark', 'Light'])
export type ResolvedTheme = typeof ResolvedTheme.Type

// MESSAGE

export const Message = defineMessageUnion({
  CompletedNavigateInternal: {},
  CompletedLoadExternal: {},
  CompletedLoadPlayground: {},
  CompletedInjectAnalytics: {},
  CompletedInjectSpeedInsights: {},
  CompletedScrollToTop: {},
  CompletedScrollToAnchor: {},
  CompletedApplyTheme: {},
  CompletedSaveThemePreference: {},
  CompletedSaveSidebarState: {},
  CompletedLoadBrowserEnvironment: {
    maybeThemePreference: Schema.Option(ThemePreference),
    maybeSidebarState: Schema.Option(SidebarState),
    systemTheme: ResolvedTheme,
    isNarrowViewport: Schema.Boolean,
    isChromium: Schema.Boolean,
    currentYear: Schema.Number,
    today: Calendar.CalendarDate,
  },
  CompletedScrollSidebarActiveLinkIntoView: {},
  CompletedScrollMobileMenuActiveLinkIntoView: {},
  SucceededCopyLink: {},
  FailedCopyLink: {},
  ClickedLink: { request: UrlRequest },
  ChangedUrl: { url: Url },
  ClickedCopySnippet: { text: Schema.String },
  ClickedCopyLink: { hash: Schema.String },
  SucceededCopySnippet: { text: Schema.String },
  FailedCopySnippet: {},
  CompletedWaitBeforeHidingCopiedIndicator: { text: Schema.String },
  GotMobileMenuDialogMessage: { message: Dialog.Message },
  ClickedOpenMobileMenu: {},
  ClickedOpenSearch: {},
  PressedSearchShortcut: {},
  ToggledMobileTableOfContents: { isOpen: Schema.Boolean },
  ClickedMobileTableOfContentsLink: { sectionId: Schema.String },
  ChangedActiveSection: { sectionId: Schema.String },
  SelectedThemePreference: { preference: ThemePreference },
  ChangedSystemTheme: { theme: ResolvedTheme },
  ChangedViewportWidth: { isNarrow: Schema.Boolean },
  GotHomeMessage: { message: Home.Message },
  GotPlaygroundMessage: { message: Playground.Message },
  GotComingFromReactMessage: { message: ComingFromReact.Message },
  GotApiReferenceMessage: { message: ApiReference.Message },
  GotUiPageMessage: { message: Ui.Message },
  ToggledSidebarGroup: { key: GroupKey, isOpen: Schema.Boolean },
  GotExampleDetailMessage: { message: ExampleDetail.Message },
  GotSearchMessage: { message: Search.Message },
  ToggledMapMessagesUnderHood: { isOpen: Schema.Boolean },
})
export type Message = typeof Message.Type
