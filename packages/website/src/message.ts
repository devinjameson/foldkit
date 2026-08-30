import { Schema as S } from 'effect'
import { Calendar } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { UrlRequest } from 'foldkit/navigation'
import { Url } from 'foldkit/url'

import { Dialog, Menu, Tabs } from '@foldkit/ui'

import * as Page from './page'
import * as Search from './search'
import { GroupKey, SidebarState } from './sidebarStorage'

// THEME

export const ThemePreference = S.Literals(['Dark', 'Light', 'System'])
export type ThemePreference = typeof ThemePreference.Type

export const ResolvedTheme = S.Literals(['Dark', 'Light'])
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
    maybeThemePreference: S.Option(ThemePreference),
    maybeSidebarState: S.Option(SidebarState),
    systemTheme: ResolvedTheme,
    isNarrowViewport: S.Boolean,
    isChromium: S.Boolean,
    currentYear: S.Number,
    today: Calendar.CalendarDate,
  },
  CompletedScrollSidebarActiveLinkIntoView: {},
  CompletedScrollMobileMenuActiveLinkIntoView: {},
  SucceededCopyLink: {},
  FailedCopyLink: {},
  ClickedLink: { request: UrlRequest },
  ChangedUrl: { url: Url },
  ClickedCopySnippet: { text: S.String },
  ClickedCopyLink: { hash: S.String },
  SucceededCopySnippet: { text: S.String },
  FailedCopySnippet: {},
  CompletedWaitBeforeHidingCopiedIndicator: { text: S.String },
  GotMobileMenuDialogMessage: { message: Dialog.Message },
  ClickedOpenMobileMenu: {},
  ToggledMobileTableOfContents: { isOpen: S.Boolean },
  ClickedMobileTableOfContentsLink: { sectionId: S.String },
  ChangedActiveSection: { sectionId: S.String },
  SelectedThemePreference: { preference: ThemePreference },
  ChangedSystemTheme: { theme: ResolvedTheme },
  ChangedViewportWidth: { isNarrow: S.Boolean },
  ToggledAiHeading: {},
  GotDemoTabsMessage: { message: Tabs.Message },
  GotPlaygroundMenuMessage: { message: Menu.Message },
  GotPlaygroundMessage: { message: Page.Playground.Message },
  GotAsyncCounterDemoMessage: { message: Page.AsyncCounterDemo.Message },
  GotNotePlayerDemoMessage: { message: Page.NotePlayerDemo.Message },
  GotComingFromReactMessage: { message: Page.ComingFromReact.Message },
  GotApiReferenceMessage: { message: Page.ApiReference.Message },
  GotUiPageMessage: { message: Page.UiPages.Message },
  ToggledSidebarGroup: { key: GroupKey, isOpen: S.Boolean },
  GotExampleDetailMessage: { message: Page.Example.ExampleDetail.Message },
  GotSearchMessage: { message: Search.Message },
  ToggledMapMessagesUnderHood: { isOpen: S.Boolean },
})
export type Message = typeof Message.Type
