import { KeyValueStore } from '@effect/platform'
import { BrowserKeyValueStore } from '@effect/platform-browser'
import classNames from 'classnames'
import {
  Array,
  Effect,
  HashSet,
  Match as M,
  Option,
  Schema as S,
  pipe,
} from 'effect'
import { Route, Runtime } from 'foldkit'
import { Html } from 'foldkit/html'
import { load, pushUrl } from 'foldkit/navigation'
import { literal } from 'foldkit/route'
import { UrlRequest } from 'foldkit/runtime'
import { ts } from 'foldkit/schema'
import { evo } from 'foldkit/struct'
import { Url, toString as urlToString } from 'foldkit/url'

import * as CommandStream from './commandStream'
import {
  AriaLabel,
  Class,
  Href,
  OnClick,
  a,
  aside,
  button,
  div,
  empty,
  h1,
  h2,
  h3,
  header,
  keyed,
  li,
  main,
  nav,
  span,
  ul,
} from './html'
import { Icon } from './icon'
import { Link } from './link'
import * as Page from './page'
import { themeSelector } from './view/themeSelector'

// ROUTE

const HomeRoute = ts('Home')
const WhyFoldkitRoute = ts('WhyFoldkit')
const GettingStartedRoute = ts('GettingStarted')
const ArchitectureRoute = ts('Architecture')
const ExamplesRoute = ts('Examples')
const BestPracticesRoute = ts('BestPractices')
const NotFoundRoute = ts('NotFound', { path: S.String })

const AppRoute = S.Union(
  HomeRoute,
  WhyFoldkitRoute,
  GettingStartedRoute,
  ArchitectureRoute,
  ExamplesRoute,
  BestPracticesRoute,
  NotFoundRoute,
)

type HomeRoute = typeof HomeRoute.Type
type WhyFoldkitRoute = typeof WhyFoldkitRoute.Type
type GettingStartedRoute = typeof GettingStartedRoute.Type
type ArchitectureRoute = typeof ArchitectureRoute.Type
type ExamplesRoute = typeof ExamplesRoute.Type
type BestPracticesRoute = typeof BestPracticesRoute.Type
type NotFoundRoute = typeof NotFoundRoute.Type
type AppRoute = typeof AppRoute.Type

const homeRouter = pipe(Route.root, Route.mapTo(HomeRoute))
const whyFoldkitRouter = pipe(
  literal('why-foldkit'),
  Route.mapTo(WhyFoldkitRoute),
)
const gettingStartedRouter = pipe(
  literal('getting-started'),
  Route.mapTo(GettingStartedRoute),
)
const architectureRouter = pipe(
  literal('architecture'),
  Route.mapTo(ArchitectureRoute),
)
const examplesRouter = pipe(
  literal('examples'),
  Route.mapTo(ExamplesRoute),
)
const bestPracticesRouter = pipe(
  literal('best-practices'),
  Route.mapTo(BestPracticesRoute),
)

const routeParser = Route.oneOf(
  whyFoldkitRouter,
  gettingStartedRouter,
  architectureRouter,
  examplesRouter,
  bestPracticesRouter,
  homeRouter,
)

const urlToAppRoute = Route.parseUrlWithFallback(
  routeParser,
  NotFoundRoute,
)

export type TableOfContentsEntry = {
  id: string
  text: string
  level: 'h2' | 'h3'
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
  activeSection: S.Option(S.String),
  themePreference: ThemePreference,
  systemTheme: ResolvedTheme,
  resolvedTheme: ResolvedTheme,
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
export const ActiveSectionChanged = ts('ActiveSectionChanged', {
  sectionId: S.String,
})
export const SetThemePreference = ts('SetThemePreference', {
  preference: ThemePreference,
})
export const SystemThemeChanged = ts('SystemThemeChanged', {
  theme: ResolvedTheme,
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
  ActiveSectionChanged,
  SetThemePreference,
  SystemThemeChanged,
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

  return [
    {
      route: urlToAppRoute(url),
      url,
      copiedSnippets: HashSet.empty(),
      mobileMenuOpen: false,
      activeSection: Option.none(),
      themePreference,
      systemTheme,
      resolvedTheme,
    },
    [
      applyThemeToDocument(resolvedTheme),
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
              [
                pushUrl(urlToString(url)).pipe(
                  Effect.as(NoOp.make()),
                ),
              ],
            ],
            External: ({
              href,
            }): [Model, ReadonlyArray<Runtime.Command<NoOp>>] => [
              model,
              [load(href).pipe(Effect.as(NoOp.make()))],
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
          onNone: () => [],
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
    }),
  )

// COMMAND

const copySnippetToClipboard = (
  text: string,
): Runtime.Command<CopySuccess | NoOp> =>
  Effect.tryPromise({
    try: () => navigator.clipboard.writeText(text),
    catch: () => new Error('Failed to copy to clipboard'),
  }).pipe(
    Effect.as(CopySuccess.make({ text })),
    Effect.catchAll(() => Effect.succeed(NoOp.make())),
  )

const copyLinkToClipboard = (url: string): Runtime.Command<NoOp> =>
  Effect.tryPromise({
    try: () => navigator.clipboard.writeText(url),
    catch: () => new Error('Failed to copy link to clipboard'),
  }).pipe(
    Effect.as(NoOp.make()),
    Effect.catchAll(() => Effect.succeed(NoOp.make())),
  )

const COPY_INDICATOR_DURATION = '2 seconds'

const hideIndicator = (
  text: string,
): Runtime.Command<HideCopiedIndicator> =>
  Effect.sleep(COPY_INDICATOR_DURATION).pipe(
    Effect.as(HideCopiedIndicator.make({ text })),
  )

const scrollToHash = (hash: string): Runtime.Command<NoOp> =>
  Effect.async((resume) => {
    requestAnimationFrame(() => {
      const element = document.getElementById(hash)
      if (element) {
        element.scrollIntoView({ behavior: 'instant' })
      }
      resume(Effect.succeed(NoOp.make()))
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
    return NoOp.make()
  })

const saveThemePreference = (
  preference: ThemePreference,
): Runtime.Command<NoOp> =>
  Effect.gen(function* () {
    const store = yield* KeyValueStore.KeyValueStore
    yield* store.set(THEME_STORAGE_KEY, JSON.stringify(preference))
    return NoOp.make()
  }).pipe(
    Effect.catchAll(() => Effect.succeed(NoOp.make())),
    Effect.provide(BrowserKeyValueStore.layerLocalStorage),
  )

// VIEW

const sidebarView = (
  currentRoute: AppRoute,
  mobileMenuOpen: boolean,
) => {
  const linkClass = (isActive: boolean) =>
    classNames('block px-2 py-1 rounded transition text-sm', {
      'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400':
        isActive,
      'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800':
        !isActive,
    })

  const navLink = (href: string, isActive: boolean, label: string) =>
    li([], [a([Href(href), Class(linkClass(isActive))], [label])])

  return aside(
    [
      Class(
        classNames(
          'absolute md:static top-0 left-0 bottom-0 z-40',
          'w-full md:w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 p-4',
          'md:h-full md:overflow-y-auto overflow-y-auto',
          {
            block: mobileMenuOpen,
            'hidden md:block': !mobileMenuOpen,
          },
        ),
      ),
    ],
    [
      nav(
        [],
        [
          h2(
            [
              Class(
                'text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3',
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
                'Home',
              ),
              navLink(
                whyFoldkitRouter.build({}),
                S.is(WhyFoldkitRoute)(currentRoute),
                'Why Foldkit?',
              ),
              navLink(
                gettingStartedRouter.build({}),
                S.is(GettingStartedRoute)(currentRoute),
                'Getting Started',
              ),
              navLink(
                architectureRouter.build({}),
                S.is(ArchitectureRoute)(currentRoute),
                'Architecture & Concepts',
              ),
              navLink(
                examplesRouter.build({}),
                S.is(ExamplesRoute)(currentRoute),
                'Examples',
              ),
              navLink(
                bestPracticesRouter.build({}),
                S.is(BestPracticesRoute)(currentRoute),
                'Best Practices',
              ),
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
        'hidden xl:block w-64 overflow-y-auto border-l border-gray-200 dark:border-gray-700 p-4',
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
            [Class('space-y-2 text-sm pl-1')],
            Array.map(entries, ({ level, id, text }) => {
              const isActive = Option.match(maybeActiveSectionId, {
                onNone: () => false,
                onSome: (activeSectionId) => activeSectionId === id,
              })

              return keyed('li')(
                id,
                [Class(classNames({ 'ml-4': level === 'h3' }))],
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

const view = (model: Model) => {
  const content = M.value(model.route).pipe(
    M.tagsExhaustive({
      Home: Page.Home.view,
      WhyFoldkit: Page.WhyFoldkit.view,
      GettingStarted: () => Page.GettingStarted.view(model),
      Architecture: () => Page.Architecture.view(model),
      Examples: Page.Examples.view,
      BestPractices: Page.BestPractices.view,
      NotFound: ({ path }) =>
        Page.NotFound.view(path, homeRouter.build({})),
    }),
  )

  const currentPageTableOfContents = M.value(model.route).pipe(
    M.tag('WhyFoldkit', () =>
      Option.some(Page.WhyFoldkit.tableOfContents),
    ),
    M.tag('GettingStarted', () =>
      Option.some(Page.GettingStarted.tableOfContents),
    ),
    M.tag('Architecture', () =>
      Option.some(Page.Architecture.tableOfContents),
    ),
    M.orElse(() => Option.none()),
  )

  return div(
    [
      Class(
        classNames('flex flex-col h-screen', {
          'overflow-hidden': model.mobileMenuOpen,
        }),
      ),
    ],
    [
      div(
        [
          Class(
            'bg-yellow-500 dark:bg-yellow-600 text-gray-900 text-center py-2 px-4 text-xs md:text-sm font-medium space-x-2 md:space-x-3',
          ),
        ],
        [
          span([], ['🔧']),
          span(
            [],
            [
              'We are building in the open! This site is a work in progress.',
            ],
          ),
          span([], ['🪛']),
        ],
      ),
      header(
        [
          Class(
            'bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 md:px-8 py-4 md:py-6 flex items-center justify-between',
          ),
        ],
        [
          div(
            [Class('flex items-center gap-4')],
            [
              button(
                [
                  Class(
                    'md:hidden p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-700 dark:text-gray-300',
                  ),
                  AriaLabel('Toggle menu'),
                  OnClick(ToggleMobileMenu.make()),
                ],
                [Icon.menu('w-6 h-6')],
              ),
              h1(
                [
                  Class(
                    'text-xl md:text-2xl font-bold text-gray-900 dark:text-white',
                  ),
                ],
                ['Foldkit'],
              ),
            ],
          ),
          div(
            [Class('flex items-center gap-3 md:gap-4')],
            [
              themeSelector(model.themePreference),
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
      div(
        [Class('flex flex-1 overflow-hidden')],
        [
          sidebarView(model.route, model.mobileMenuOpen),
          main(
            [
              Class(
                'flex-1 min-w-0 overflow-y-auto bg-white dark:bg-gray-900',
              ),
            ],
            [
              keyed('div')(
                model.route._tag,
                [Class('p-4 md:p-8 max-w-4xl mx-auto min-w-0')],
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
    onUrlRequest: (request) => LinkClicked.make({ request }),
    onUrlChange: (url) => UrlChanged.make({ url }),
  },
})

Runtime.run(application)
