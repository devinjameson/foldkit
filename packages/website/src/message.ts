import { Schema } from 'effect'
import { Calendar } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { UrlRequest } from 'foldkit/navigation'
import { Url } from 'foldkit/url'

import { Dialog, Menu, Tabs } from '@foldkit/ui'

import * as Page from './page'
import * as Search from './search'
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
  ToggledMobileTableOfContents: { isOpen: Schema.Boolean },
  ClickedMobileTableOfContentsLink: { sectionId: Schema.String },
  ChangedActiveSection: { sectionId: Schema.String },
  SelectedThemePreference: { preference: ThemePreference },
  ChangedSystemTheme: { theme: ResolvedTheme },
  ChangedViewportWidth: { isNarrow: Schema.Boolean },
  ToggledAiHeading: {},
  GotDemoTabsMessage: { message: Tabs.Message },
  GotPlaygroundMenuMessage: { message: Menu.Message },
  GotPlaygroundMessage: { message: Page.Playground.Message },
  GotAsyncCounterDemoMessage: { message: Page.AsyncCounterDemo.Message },
  GotNotePlayerDemoMessage: { message: Page.NotePlayerDemo.Message },
  GotComingFromReactMessage: { message: Page.ComingFromReact.Message },
  GotApiReferenceMessage: { message: Page.ApiReference.Message },
  GotUiPageMessage: { message: Page.UiPages.Message },
  ToggledSidebarGroup: { key: GroupKey, isOpen: Schema.Boolean },
  GotExampleDetailMessage: { message: Page.Example.ExampleDetail.Message },
  GotSearchMessage: { message: Search.Message },
  ToggledMapMessagesUnderHood: { isOpen: Schema.Boolean },
})
export type Message = typeof Message.Type
