import { KeyValueStore } from '@effect/platform'
import { BrowserKeyValueStore } from '@effect/platform-browser'
import { inject } from '@vercel/analytics'
import classNames from 'classnames'
import {
  Array,
  Effect,
  HashSet,
  Match as M,
  Option,
  Schema as S,
} from 'effect'
import { Runtime } from 'foldkit'
import { Html } from 'foldkit/html'
import { load, pushUrl } from 'foldkit/navigation'
import { UrlRequest } from 'foldkit/runtime'
import { ts } from 'foldkit/schema'
import { evo } from 'foldkit/struct'
import { Url, toString as urlToString } from 'foldkit/url'

import * as CommandStream from './commandStream'
import {
  Alt,
  AriaLabel,
  Class,
  Href,
  Id,
  OnClick,
  OnToggle,
  Open,
  Src,
  a,
  aside,
  button,
  details,
  div,
  empty,
  h2,
  h3,
  header,
  img,
  keyed,
  li,
  main,
  nav,
  span,
  summary,
  ul,
} from './html'
import { Icon } from './icon'
import { Link } from './link'
import * as Page from './page'
import {
  AdvancedPatternsRoute,
  ApiReferenceRoute,
  AppRoute,
  ArchitectureAndConceptsRoute,
  BestPracticesRoute,
  ComingFromReactRoute,
  ExamplesRoute,
  FoldkitUiRoute,
  GettingStartedRoute,
  HomeRoute,
  ProjectOrganizationRoute,
  RoutingAndNavigationRoute,
  WhyFoldkitRoute,
  advancedPatternsRouter,
  apiReferenceRouter,
  architectureAndConceptsRouter,
  bestPracticesRouter,
  comingFromReactRouter,
  examplesRouter,
  foldkitUiRouter,
  gettingStartedRouter,
  homeRouter,
  projectOrganizationRouter,
  routingAndNavigationRouter,
  urlToAppRoute,
  whyFoldkitRouter,
} from './route'
import { themeSelector } from './view/themeSelector'

export type TableOfContentsEntry = {
  id: string
  text: string
  level: 'h2' | 'h3' | 'h4'
}

// THEME

const ThemePreference = S.Literal('Dark', 'Light', 'System')
const ResolvedTheme = S.Literal('Dark', 'Light')
const THEME_STORAGE_KEY = 'theme-preference'

export type ThemePreference = typeof ThemePreference.Type
export type ResolvedTheme = typeof ResolvedTheme.Type

const resolveTheme = (
  preference: ThemePreference,
  systemTheme: ResolvedTheme,
): ResolvedTheme =>
  M.value(preference).pipe(
    M.withReturnType<ResolvedTheme>(),
    M.when('Dark', () => 'Dark'),
    M.when('Light', () => 'Light'),
    M.when('System', () => systemTheme),
    M.exhaustive,
  )

// FLAGS

const Flags = S.Struct({
  themePreference: S.Option(ThemePreference),
  systemTheme: ResolvedTheme,
})

type Flags = typeof Flags.Type

const getSystemTheme = (): ResolvedTheme =>
  window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'Dark'
    : 'Light'

const flags: Effect.Effect<Flags> = Effect.gen(function* () {
  const store = yield* KeyValueStore.KeyValueStore
  const maybeJson = yield* store.get(THEME_STORAGE_KEY)
  const json = yield* maybeJson
  const theme = yield* S.decode(S.parseJson(ThemePreference))(json)
  return {
    themePreference: Option.some(theme),
    systemTheme: getSystemTheme(),
  }
}).pipe(
  Effect.catchAll(() =>
    Effect.succeed({
      themePreference: Option.none(),
      systemTheme: getSystemTheme(),
    }),
  ),
  Effect.provide(BrowserKeyValueStore.layerLocalStorage),
)

// MODEL

export const Model = S.Struct({
  route: AppRoute,
  url: Url,
  copiedSnippets: S.HashSet(S.String),
  mobileMenuOpen: S.Boolean,
  mobileTableOfContentsOpen: S.Boolean,
  activeSection: S.Option(S.String),
  themePreference: ThemePreference,
  systemTheme: ResolvedTheme,
  resolvedTheme: ResolvedTheme,
  foldkitUi: Page.FoldkitUi.Model,
  comingFromReact: Page.ComingFromReact.Model,
  apiReference: Page.ApiReference.Model,
})

export type Model = typeof Model.Type

// MESSAGE

const NoOp = ts('NoOp')
const LinkClicked = ts('LinkClicked', {
  request: UrlRequest,
})
const UrlChanged = ts('UrlChanged', { url: Url })
export const CopySnippetToClipboard = ts('CopySnippetToClipboard', {
  text: S.String,
})
export const CopyLinkToClipboard = ts('CopyLinkToClipboard', {
  hash: S.String,
})
const CopySuccess = ts('CopySuccess', { text: S.String })
const HideCopiedIndicator = ts('HideCopiedIndicator', {
  text: S.String,
})
const ToggleMobileMenu = ts('ToggleMobileMenu')
const MobileTableOfContentsToggled = ts(
  'MobileTableOfContentsToggled',
  {
    isOpen: S.Boolean,
  },
)
const MobileTableOfContentsLinkClicked = ts(
  'MobileTableOfContentsLinkClicked',
)
export const ActiveSectionChanged = ts('ActiveSectionChanged', {
  sectionId: S.String,
})
export const SetThemePreference = ts('SetThemePreference', {
  preference: ThemePreference,
})
export const SystemThemeChanged = ts('SystemThemeChanged', {
  theme: ResolvedTheme,
})
const FoldkitUiMessage = ts('FoldkitUiMessage', {
  message: Page.FoldkitUi.Message,
})
const ComingFromReactMessage = ts('ComingFromReactMessage', {
  message: Page.ComingFromReact.Message,
})
const ApiReferenceMessage = ts('ApiReferenceMessage', {
  message: Page.ApiReference.Message,
})

const Message = S.Union(
  NoOp,
  LinkClicked,
  UrlChanged,
  CopySnippetToClipboard,
  CopyLinkToClipboard,
  CopySuccess,
  HideCopiedIndicator,
  ToggleMobileMenu,
  MobileTableOfContentsToggled,
  MobileTableOfContentsLinkClicked,
  ActiveSectionChanged,
  SetThemePreference,
  SystemThemeChanged,
  FoldkitUiMessage,
  ComingFromReactMessage,
  ApiReferenceMessage,
)

type NoOp = typeof NoOp.Type
type LinkClicked = typeof LinkClicked.Type
type UrlChanged = typeof UrlChanged.Type
type CopySnippetToClipboard = typeof CopySnippetToClipboard.Type
type CopyLinkToClipboard = typeof CopyLinkToClipboard.Type
type CopySuccess = typeof CopySuccess.Type
type HideCopiedIndicator = typeof HideCopiedIndicator.Type
type ToggleMobileMenu = typeof ToggleMobileMenu.Type
export type ActiveSectionChanged = typeof ActiveSectionChanged.Type
export type SetThemePreference = typeof SetThemePreference.Type
export type SystemThemeChanged = typeof SystemThemeChanged.Type
type FoldkitUiMessage = typeof FoldkitUiMessage.Type
type ComingFromReactMessage = typeof ComingFromReactMessage.Type
type ApiReferenceMessage = typeof ApiReferenceMessage.Type

export type Message = typeof Message.Type

// INIT

const init: Runtime.ApplicationInit<Model, Message, Flags> = (
  loadedFlags: Flags,
  url: Url,
) => {
  const themePreference = Option.getOrElse(
    loadedFlags.themePreference,
    () => 'System' as const,
  )
  const { systemTheme } = loadedFlags
  const resolvedTheme = resolveTheme(themePreference, systemTheme)

  const [foldkitUi, foldkitUiCommands] = Page.FoldkitUi.init()
  const [comingFromReact, comingFromReactCommands] =
    Page.ComingFromReact.init()
  const [apiReference, apiReferenceCommands] = Page.ApiReference.init(
    Page.ApiReference.apiReference.modules,
  )

  const mappedFoldkitUiCommands = foldkitUiCommands.map((message) =>
    Effect.map(message, (message) => FoldkitUiMessage({ message })),
  )

  const mappedComingFromReactCommands = comingFromReactCommands.map(
    Effect.map((message) => ComingFromReactMessage({ message })),
  )

  const mappedApiReferenceCommands = apiReferenceCommands.map(
    Effect.map((message) => ApiReferenceMessage({ message })),
  )

  return [
    {
      route: urlToAppRoute(url),
      url,
      copiedSnippets: HashSet.empty(),
      mobileMenuOpen: false,
      mobileTableOfContentsOpen: false,
      activeSection: Option.none(),
      themePreference,
      systemTheme,
      resolvedTheme,
      foldkitUi,
      comingFromReact,
      apiReference,
    },
    [
      injectAnalytics,
      applyThemeToDocument(resolvedTheme),
      ...mappedFoldkitUiCommands,
      ...mappedComingFromReactCommands,
      ...mappedApiReferenceCommands,
      ...Option.match(url.hash, {
        onNone: () => [],
        onSome: (hash) => [scrollToHash(hash)],
      }),
    ],
  ]
}

// UPDATE

const update = (
  model: Model,
  message: Message,
): [Model, ReadonlyArray<Runtime.Command<Message>>] =>
  M.value(message).pipe(
    M.withReturnType<
      [Model, ReadonlyArray<Runtime.Command<Message>>]
    >(),
    M.tagsExhaustive({
      NoOp: () => [model, []],

      LinkClicked: ({ request }) =>
        M.value(request).pipe(
          M.tagsExhaustive({
            Internal: ({
              url,
            }): [Model, ReadonlyArray<Runtime.Command<NoOp>>] => [
              model,
              [pushUrl(urlToString(url)).pipe(Effect.as(NoOp()))],
            ],
            External: ({
              href,
            }): [Model, ReadonlyArray<Runtime.Command<NoOp>>] => [
              model,
              [load(href).pipe(Effect.as(NoOp()))],
            ],
          }),
        ),

      UrlChanged: ({ url }) => [
        evo(model, {
          route: () => urlToAppRoute(url),
          url: () => url,
          mobileMenuOpen: () => false,
        }),
        Option.match(url.hash, {
          onNone: () => [scrollToTop],
          onSome: (hash) => [scrollToHash(hash)],
        }),
      ],

      CopySnippetToClipboard: ({ text }) => [
        model,
        [copySnippetToClipboard(text)],
      ],

      CopyLinkToClipboard: ({ hash }) => [
        model,
        [
          copyLinkToClipboard(
            urlToString({ ...model.url, hash: Option.some(hash) }),
          ),
        ],
      ],

      CopySuccess: ({ text }) =>
        HashSet.has(model.copiedSnippets, text)
          ? [model, []]
          : [
              evo(model, {
                copiedSnippets: HashSet.add(text),
              }),
              [hideIndicator(text)],
            ],

      HideCopiedIndicator: ({ text }) => [
        evo(model, {
          copiedSnippets: HashSet.remove(text),
        }),
        [],
      ],

      ToggleMobileMenu: () => [
        evo(model, {
          mobileMenuOpen: (mobileMenuOpen) => !mobileMenuOpen,
        }),
        [],
      ],

      MobileTableOfContentsToggled: ({ isOpen }) => [
        evo(model, { mobileTableOfContentsOpen: () => isOpen }),
        [],
      ],

      MobileTableOfContentsLinkClicked: () => [
        evo(model, { mobileTableOfContentsOpen: () => false }),
        [],
      ],

      ActiveSectionChanged: ({ sectionId }) => [
        evo(model, {
          activeSection: () => Option.some(sectionId),
        }),
        [],
      ],

      SetThemePreference: ({ preference }) => {
        const resolvedTheme = resolveTheme(
          preference,
          model.systemTheme,
        )

        return [
          evo(model, {
            themePreference: () => preference,
            resolvedTheme: () => resolvedTheme,
          }),
          [
            applyThemeToDocument(resolvedTheme),
            saveThemePreference(preference),
          ],
        ]
      },

      FoldkitUiMessage: ({ message }) => {
        const [nextFoldkitUi, foldkitUiCommands] =
          Page.FoldkitUi.update(model.foldkitUi, message)

        return [
          evo(model, { foldkitUi: () => nextFoldkitUi }),
          foldkitUiCommands.map(
            Effect.map((message) => FoldkitUiMessage({ message })),
          ),
        ]
      },

      SystemThemeChanged: ({ theme }) => {
        const resolvedTheme = resolveTheme(
          model.themePreference,
          theme,
        )

        return [
          evo(model, {
            systemTheme: () => theme,
            resolvedTheme: () => resolvedTheme,
          }),
          [applyThemeToDocument(resolvedTheme)],
        ]
      },

      ComingFromReactMessage: ({ message }) => {
        const [nextComingFromReact, comingFromReactCommands] =
          Page.ComingFromReact.update(model.comingFromReact, message)

        return [
          evo(model, {
            comingFromReact: () => nextComingFromReact,
          }),
          comingFromReactCommands.map(
            Effect.map((message) =>
              ComingFromReactMessage({ message }),
            ),
          ),
        ]
      },

      ApiReferenceMessage: ({ message }) => {
        const [nextApiReference, apiReferenceCommands] =
          Page.ApiReference.update(model.apiReference, message)

        return [
          evo(model, { apiReference: () => nextApiReference }),
          apiReferenceCommands.map(
            Effect.map((message) => ApiReferenceMessage({ message })),
          ),
        ]
      },
    }),
  )

// COMMAND

const injectAnalytics: Runtime.Command<NoOp> = Effect.sync(() =>
  inject(),
).pipe(Effect.as(NoOp()))

const copySnippetToClipboard = (
  text: string,
): Runtime.Command<CopySuccess | NoOp> =>
  Effect.tryPromise({
    try: () => navigator.clipboard.writeText(text),
    catch: () => new Error('Failed to copy to clipboard'),
  }).pipe(
    Effect.as(CopySuccess({ text })),
    Effect.catchAll(() => Effect.succeed(NoOp())),
  )

const copyLinkToClipboard = (url: string): Runtime.Command<NoOp> =>
  Effect.tryPromise({
    try: () => navigator.clipboard.writeText(url),
    catch: () => new Error('Failed to copy link to clipboard'),
  }).pipe(
    Effect.as(NoOp()),
    Effect.catchAll(() => Effect.succeed(NoOp())),
  )

const COPY_INDICATOR_DURATION = '2 seconds'

const hideIndicator = (
  text: string,
): Runtime.Command<HideCopiedIndicator> =>
  Effect.sleep(COPY_INDICATOR_DURATION).pipe(
    Effect.as(HideCopiedIndicator({ text })),
  )

const scrollToTop: Runtime.Command<NoOp> = Effect.sync(() => {
  window.scrollTo({ top: 0, behavior: 'instant' })
  return NoOp()
})

const scrollToHash = (hash: string): Runtime.Command<NoOp> =>
  Effect.async((resume) => {
    requestAnimationFrame(() => {
      const element = document.getElementById(hash)
      if (element) {
        element.scrollIntoView({ behavior: 'instant' })
      }
      resume(Effect.succeed(NoOp()))
    })
  })

const applyThemeToDocument = (
  theme: ResolvedTheme,
): Runtime.Command<NoOp> =>
  Effect.sync(() => {
    M.value(theme).pipe(
      M.when('Dark', () =>
        document.documentElement.classList.add('dark'),
      ),
      M.when('Light', () =>
        document.documentElement.classList.remove('dark'),
      ),
      M.exhaustive,
    )
    return NoOp()
  })

const saveThemePreference = (
  preference: ThemePreference,
): Runtime.Command<NoOp> =>
  Effect.gen(function* () {
    const store = yield* KeyValueStore.KeyValueStore
    yield* store.set(THEME_STORAGE_KEY, JSON.stringify(preference))
    return NoOp()
  }).pipe(
    Effect.catchAll(() => Effect.succeed(NoOp())),
    Effect.provide(BrowserKeyValueStore.layerLocalStorage),
  )

// VIEW

const sidebarView = (
  currentRoute: AppRoute,
  mobileMenuOpen: boolean,
) => {
  const linkClass = (isActive: boolean) =>
    classNames(
      'block px-4 py-3 md:px-2.5 md:py-1 rounded transition text-base md:text-sm font-medium md:font-normal',
      {
        'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400':
          isActive,
        'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800':
          !isActive,
      },
    )

  const navLink = (href: string, isActive: boolean, label: string) =>
    li([], [a([Href(href), Class(linkClass(isActive))], [label])])

  return aside(
    [
      Class(
        classNames(
          'fixed inset-0 md:top-[var(--header-height)] md:bottom-0 md:left-0 md:right-auto z-[60] md:z-40 md:w-64 bg-white dark:bg-gray-900 md:border-r border-gray-300 dark:border-gray-700 flex flex-col',
          {
            flex: mobileMenuOpen,
            'hidden md:flex': !mobileMenuOpen,
          },
        ),
      ),
    ],
    [
      div(
        [
          Class(
            'flex justify-between items-center p-4 md:hidden border-b border-gray-300 dark:border-gray-700 shrink-0 bg-white dark:bg-black',
          ),
        ],
        [
          a(
            [Href(homeRouter.build({}))],
            [
              img([
                Src('/logo.svg'),
                Alt('Foldkit'),
                Class('h-6 dark:invert'),
              ]),
            ],
          ),
          button(
            [
              Class(
                'p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-700 dark:text-gray-300 cursor-pointer',
              ),
              AriaLabel('Close menu'),
              OnClick(ToggleMobileMenu()),
            ],
            [Icon.close('w-6 h-6')],
          ),
        ],
      ),
      nav(
        [Class('flex-1 overflow-y-auto p-4')],
        [
          h2(
            [
              Class(
                'hidden md:block text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3',
              ),
            ],
            ['Documentation'],
          ),
          ul(
            [Class('space-y-1')],
            [
              navLink(
                homeRouter.build({}),
                S.is(HomeRoute)(currentRoute),
                'Introduction',
              ),
              navLink(
                whyFoldkitRouter.build({}),
                S.is(WhyFoldkitRoute)(currentRoute),
                'Why Foldkit?',
              ),
              navLink(
                comingFromReactRouter.build({}),
                S.is(ComingFromReactRoute)(currentRoute),
                'Coming from React',
              ),
              navLink(
                gettingStartedRouter.build({}),
                S.is(GettingStartedRoute)(currentRoute),
                'Getting Started',
              ),
              navLink(
                architectureAndConceptsRouter.build({}),
                S.is(ArchitectureAndConceptsRoute)(currentRoute),
                'Architecture & Concepts',
              ),
              navLink(
                routingAndNavigationRouter.build({}),
                S.is(RoutingAndNavigationRoute)(currentRoute),
                'Routing & Navigation',
              ),
              navLink(
                projectOrganizationRouter.build({}),
                S.is(ProjectOrganizationRoute)(currentRoute),
                'Project Organization',
              ),
              navLink(
                advancedPatternsRouter.build({}),
                S.is(AdvancedPatternsRoute)(currentRoute),
                'Advanced Patterns',
              ),
              navLink(
                bestPracticesRouter.build({}),
                S.is(BestPracticesRoute)(currentRoute),
                'Best Practices',
              ),
              navLink(
                examplesRouter.build({}),
                S.is(ExamplesRoute)(currentRoute),
                'Example Apps',
              ),
              navLink(
                foldkitUiRouter.build({}),
                S.is(FoldkitUiRoute)(currentRoute),
                'Foldkit UI',
              ),
              navLink(
                apiReferenceRouter.build({}),
                S.is(ApiReferenceRoute)(currentRoute),
                'API Reference',
              ),
            ],
          ),
        ],
      ),
      div(
        [
          Class(
            'md:hidden p-4 border-t border-gray-300 dark:border-gray-700 shrink-0',
          ),
        ],
        [
          div(
            [Class('flex items-center justify-center gap-8')],
            [
              iconLink(Link.github, 'GitHub', Icon.github('w-6 h-6')),
              iconLink(Link.npm, 'npm', Icon.npm('w-8 h-8')),
            ],
          ),
        ],
      ),
    ],
  )
}

const iconLink = (link: string, ariaLabel: string, icon: Html) =>
  a(
    [
      Href(link),
      Class(
        'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition',
      ),
      AriaLabel(ariaLabel),
    ],
    [icon],
  )

const tableOfContentsView = (
  entries: ReadonlyArray<TableOfContentsEntry>,
  maybeActiveSectionId: Option.Option<string>,
) =>
  aside(
    [
      Class(
        'hidden xl:block sticky top-[var(--header-height)] min-w-64 w-fit h-[calc(100vh-var(--header-height))] shrink-0 overflow-y-auto border-l border-gray-300 dark:border-gray-700 p-4',
      ),
    ],
    [
      h3(
        [
          Class(
            'text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-2',
          ),
        ],
        ['On This Page'],
      ),
      nav(
        [],
        [
          ul(
            [Class('space-y-2 text-sm')],
            Array.map(entries, ({ level, id, text }) => {
              const isActive = Option.match(maybeActiveSectionId, {
                onNone: () => false,
                onSome: (activeSectionId) => activeSectionId === id,
              })

              return keyed('li')(
                id,
                [
                  Class(
                    classNames({
                      'ml-3': level === 'h3',
                      'ml-6': level === 'h4',
                    }),
                  ),
                ],
                [
                  a(
                    [
                      Href(`#${id}`),
                      Class(
                        classNames('transition block', {
                          'text-blue-600 dark:text-blue-400 underline':
                            isActive,
                          'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white':
                            !isActive,
                        }),
                      ),
                    ],
                    [text],
                  ),
                ],
              )
            }),
          ),
        ],
      ),
    ],
  )

const mobileTableOfContentsView = (
  entries: ReadonlyArray<TableOfContentsEntry>,
  maybeActiveSectionId: Option.Option<string>,
  isOpen: boolean,
) => {
  const firstEntryText = Array.head(entries).pipe(
    Option.match({
      onNone: () => '',
      onSome: ({ text }) => text,
    }),
  )

  const activeSectionText = Option.match(maybeActiveSectionId, {
    onNone: () => firstEntryText,
    onSome: (activeSectionId) =>
      Option.match(
        Array.findFirst(entries, ({ id }) => id === activeSectionId),
        {
          onNone: () => firstEntryText,
          onSome: ({ text }) => text,
        },
      ),
  })

  return details(
    [
      Id('mobile-table-of-contents'),
      Open(isOpen),
      OnToggle((open) =>
        MobileTableOfContentsToggled({ isOpen: open }),
      ),
      Class(
        'group xl:hidden fixed top-[var(--header-height)] left-0 right-0 md:left-64 z-40 bg-white dark:bg-black border-b border-gray-300 dark:border-gray-700',
      ),
    ],
    [
      summary(
        [
          Class(
            'flex items-center justify-between px-4 py-3 cursor-pointer list-none [&::-webkit-details-marker]:hidden group-open:border-b group-open:border-gray-300 dark:group-open:border-gray-700',
          ),
        ],
        [
          div(
            [Class('flex items-center gap-2 min-w-0')],
            [
              span(
                [
                  Class(
                    'text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider shrink-0',
                  ),
                ],
                ['On this page'],
              ),
              span(
                [
                  Class(
                    'text-sm text-gray-900 dark:text-white truncate',
                  ),
                ],
                [activeSectionText],
              ),
            ],
          ),
          span(
            [
              Class(
                'text-gray-500 dark:text-gray-400 shrink-0 ml-2 transition-transform group-open:rotate-180',
              ),
            ],
            [Icon.chevronDown('w-4 h-4')],
          ),
        ],
      ),
      nav(
        [Class('max-h-[50vh] overflow-y-auto')],
        [
          ul(
            [
              Class(
                'text-sm divide-y divide-gray-300 dark:divide-gray-700',
              ),
            ],
            Array.map(entries, ({ level, id, text }) => {
              const isActive = Option.match(maybeActiveSectionId, {
                onNone: () => false,
                onSome: (activeSectionId) => activeSectionId === id,
              })

              return keyed('li')(
                id,
                [],
                [
                  a(
                    [
                      Href(`#${id}`),
                      OnClick(MobileTableOfContentsLinkClicked()),
                      Class(
                        classNames(
                          'transition flex items-center justify-between py-3 px-4',
                          {
                            'pl-8': level === 'h3',
                            'pl-12': level === 'h4',
                            'text-blue-600 dark:text-blue-400':
                              isActive,
                            'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white':
                              !isActive,
                          },
                        ),
                      ),
                    ],
                    [
                      text,
                      isActive
                        ? Icon.check(
                            'w-4 h-4 text-blue-600 dark:text-blue-400',
                          )
                        : empty,
                    ],
                  ),
                ],
              )
            }),
          ),
        ],
      ),
    ],
  )
}

const view = (model: Model) => {
  const content = M.value(model.route).pipe(
    M.tagsExhaustive({
      Home: Page.Home.view,
      WhyFoldkit: Page.WhyFoldkit.view,
      ComingFromReact: () =>
        Page.ComingFromReact.view(
          model,
          model.comingFromReact,
          (message) => ComingFromReactMessage({ message }),
        ),
      GettingStarted: () => Page.GettingStarted.view(model),
      ArchitectureAndConcepts: () =>
        Page.ArchitectureAndConcepts.view(model),
      RoutingAndNavigation: () => Page.Routing.view(model),
      Examples: Page.Examples.view,
      BestPractices: () => Page.BestPractices.view(model),
      ProjectOrganization: () => Page.ProjectOrganization.view(model),
      AdvancedPatterns: () => Page.AdvancedPatterns.view(model),
      ApiReference: () =>
        Page.ApiReference.view(
          Page.ApiReference.apiReference.modules,
          model.apiReference,
          (message) => ApiReferenceMessage({ message }),
        ),
      FoldkitUi: () =>
        Page.FoldkitUi.view(model.foldkitUi, (message) =>
          FoldkitUiMessage({ message }),
        ),
      NotFound: ({ path }) =>
        Page.NotFound.view(path, homeRouter.build({})),
    }),
  )

  const currentPageTableOfContents = M.value(model.route).pipe(
    M.tag('WhyFoldkit', () =>
      Option.some(Page.WhyFoldkit.tableOfContents),
    ),
    M.tag('ComingFromReact', () =>
      Option.some(Page.ComingFromReact.tableOfContents),
    ),
    M.tag('GettingStarted', () =>
      Option.some(Page.GettingStarted.tableOfContents),
    ),
    M.tag('ArchitectureAndConcepts', () =>
      Option.some(Page.ArchitectureAndConcepts.tableOfContents),
    ),
    M.tag('RoutingAndNavigation', () =>
      Option.some(Page.Routing.tableOfContents),
    ),
    M.tag('BestPractices', () =>
      Option.some(Page.BestPractices.tableOfContents),
    ),
    M.tag('ProjectOrganization', () =>
      Option.some(Page.ProjectOrganization.tableOfContents),
    ),
    M.tag('AdvancedPatterns', () =>
      Option.some(Page.AdvancedPatterns.tableOfContents),
    ),
    M.tag('ApiReference', () =>
      Option.some(Page.ApiReference.apiReferenceTableOfContents),
    ),
    M.tag('FoldkitUi', () =>
      Option.some(Page.FoldkitUi.tableOfContents),
    ),
    M.orElse(() => Option.none()),
  )

  return div(
    [
      Class(
        classNames('flex flex-col min-h-screen', {
          'overflow-hidden': model.mobileMenuOpen,
        }),
      ),
    ],
    [
      header(
        [
          Class(
            'fixed top-0 inset-x-0 z-50 h-[var(--header-height)] bg-white dark:bg-black border-b border-gray-300 dark:border-gray-700 pl-2 pr-3 md:px-8 flex items-center justify-between',
          ),
        ],
        [
          div(
            [Class('flex items-center gap-2')],
            [
              button(
                [
                  Class(
                    'md:hidden p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-800 transition text-gray-700 dark:text-gray-300 cursor-pointer',
                  ),
                  AriaLabel('Toggle menu'),
                  OnClick(ToggleMobileMenu()),
                ],
                [Icon.menu('w-6 h-6')],
              ),
              a(
                [Href(homeRouter.build({}))],
                [
                  img([
                    Src('/logo.svg'),
                    Alt('Foldkit'),
                    Class('h-6 md:h-8 dark:invert'),
                  ]),
                ],
              ),
            ],
          ),
          div(
            [Class('flex items-center gap-6 md:gap-8')],
            [
              themeSelector(model.themePreference),
              div(
                [Class('flex items-center gap-3 md:gap-4')],
                [
                  iconLink(
                    Link.github,
                    'GitHub',
                    Icon.github('w-5 h-5 md:w-6 md:h-6'),
                  ),
                  iconLink(
                    Link.npm,
                    'npm',
                    Icon.npm('w-6 h-6 md:w-8 md:h-8'),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
      div(
        [Class('flex flex-1 pt-[var(--header-height)] md:pl-64')],
        [
          sidebarView(model.route, model.mobileMenuOpen),
          main(
            [
              Class(
                classNames(
                  'flex-1 min-w-0 bg-gray-100 dark:bg-gray-900',
                  {
                    'pt-[var(--mobile-toc-height)]': Option.isSome(
                      currentPageTableOfContents,
                    ),
                  },
                ),
              ),
            ],
            [
              Option.match(currentPageTableOfContents, {
                onSome: (tableOfContents) =>
                  mobileTableOfContentsView(
                    tableOfContents,
                    model.activeSection,
                    model.mobileTableOfContentsOpen,
                  ),
                onNone: () => empty,
              }),
              keyed('div')(
                model.route._tag,
                [
                  Class(
                    'px-4 py-6 md:px-8 md:py-10 px- max-w-4xl mx-auto min-w-0',
                  ),
                ],
                [content],
              ),
            ],
          ),
          Option.match(currentPageTableOfContents, {
            onSome: (tableOfContents) =>
              tableOfContentsView(
                tableOfContents,
                model.activeSection,
              ),
            onNone: () => empty,
          }),
        ],
      ),
    ],
  )
}

// COMMAND STREAMS

const CommandStreamsDeps = S.Struct({
  activeSection: S.Struct({
    pageId: S.String,
    sections: S.Array(S.String),
  }),
  systemTheme: S.Struct({
    isSystemPreference: S.Boolean,
  }),
})

export type CommandStreamsDeps = typeof CommandStreamsDeps.Type

const commandStreams = Runtime.makeCommandStreams(CommandStreamsDeps)<
  Model,
  Message
>({
  activeSection: CommandStream.activeSection,
  systemTheme: CommandStream.systemTheme,
})

// RUN

const application = Runtime.makeApplication({
  Model,
  Flags,
  flags,
  init,
  update,
  view,
  commandStreams,
  container: document.getElementById('root')!,
  browser: {
    onUrlRequest: (request) => LinkClicked({ request }),
    onUrlChange: (url) => UrlChanged({ url }),
  },
})

Runtime.run(application)
