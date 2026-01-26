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
  Alt,
  AriaLabel,
  Class,
  Href,
  Id,
  OnClick,
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
import { themeSelector } from './view/themeSelector'

// ROUTE

const HomeRoute = ts('Home')
const WhyFoldkitRoute = ts('WhyFoldkit')
const GettingStartedRoute = ts('GettingStarted')
const ArchitectureAndConceptsRoute = ts('ArchitectureAndConcepts')
const RoutingRoute = ts('Routing')
const ExamplesRoute = ts('Examples')
const BestPracticesRoute = ts('BestPractices')
const ProjectOrganizationRoute = ts('ProjectOrganization')
const NotFoundRoute = ts('NotFound', { path: S.String })

const AppRoute = S.Union(
  HomeRoute,
  WhyFoldkitRoute,
  GettingStartedRoute,
  ArchitectureAndConceptsRoute,
  RoutingRoute,
  ExamplesRoute,
  BestPracticesRoute,
  ProjectOrganizationRoute,
  NotFoundRoute,
)

type HomeRoute = typeof HomeRoute.Type
type WhyFoldkitRoute = typeof WhyFoldkitRoute.Type
type GettingStartedRoute = typeof GettingStartedRoute.Type
type ArchitectureAndConceptsRoute =
  typeof ArchitectureAndConceptsRoute.Type
type RoutingRoute = typeof RoutingRoute.Type
type ExamplesRoute = typeof ExamplesRoute.Type
type BestPracticesRoute = typeof BestPracticesRoute.Type
type ProjectOrganizationRoute = typeof ProjectOrganizationRoute.Type
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
const architectureAndConceptsRouter = pipe(
  literal('architecture-and-concepts'),
  Route.mapTo(ArchitectureAndConceptsRoute),
)
const routingRouter = pipe(
  literal('routing'),
  Route.mapTo(RoutingRoute),
)
const examplesRouter = pipe(
  literal('examples'),
  Route.mapTo(ExamplesRoute),
)
const bestPracticesRouter = pipe(
  literal('best-practices'),
  Route.mapTo(BestPracticesRoute),
)
const projectOrganizationRouter = pipe(
  literal('project-organization'),
  Route.mapTo(ProjectOrganizationRoute),
)

const routeParser = Route.oneOf(
  whyFoldkitRouter,
  gettingStartedRouter,
  architectureAndConceptsRouter,
  routingRouter,
  examplesRouter,
  bestPracticesRouter,
  projectOrganizationRouter,
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
  mobileTableOfContentsOpen: S.Boolean,
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
const CloseMobileTableOfContents = ts('CloseMobileTableOfContents')
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
  CloseMobileTableOfContents,
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
      mobileTableOfContentsOpen: false,
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

      CloseMobileTableOfContents: () => [
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

const scrollToTop: Runtime.Command<NoOp> = Effect.sync(() => {
  window.scrollTo({ top: 0, behavior: 'instant' })
  return NoOp.make()
})

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
          'fixed inset-0 md:top-[var(--header-height)] md:bottom-0 md:left-0 md:right-auto z-[60] md:z-40 md:w-64 overflow-y-auto bg-white dark:bg-gray-900 md:border-r border-gray-200 dark:border-gray-700 p-4',
          {
            block: mobileMenuOpen,
            'hidden md:block': !mobileMenuOpen,
          },
        ),
      ),
    ],
    [
      div(
        [Class('flex justify-between items-center mb-4 md:hidden')],
        [
          img([
            Src('/logo.svg'),
            Alt('Foldkit'),
            Class('h-6 dark:invert'),
          ]),
          button(
            [
              Class(
                'p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-700 dark:text-gray-300',
              ),
              AriaLabel('Close menu'),
              OnClick(ToggleMobileMenu.make()),
            ],
            [Icon.close('w-6 h-6')],
          ),
        ],
      ),
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
                architectureAndConceptsRouter.build({}),
                S.is(ArchitectureAndConceptsRoute)(currentRoute),
                'Architecture & Concepts',
              ),
              navLink(
                routingRouter.build({}),
                S.is(RoutingRoute)(currentRoute),
                'Routing',
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
              navLink(
                projectOrganizationRouter.build({}),
                S.is(ProjectOrganizationRoute)(currentRoute),
                'Project Organization',
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
        'hidden xl:block sticky top-[var(--header-height)] w-64 h-[calc(100vh-var(--header-height))] shrink-0 overflow-y-auto border-l border-gray-200 dark:border-gray-700 p-4',
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
      Class(
        'group xl:hidden fixed top-[var(--header-height)] inset-x-0 z-40 bg-gray-100 dark:bg-black border-b border-gray-200 dark:border-gray-700',
      ),
    ],
    [
      summary(
        [
          Class(
            'flex items-center justify-between px-4 py-3 cursor-pointer list-none [&::-webkit-details-marker]:hidden group-open:border-b group-open:border-gray-200 dark:group-open:border-gray-700',
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
        [Class('max-h-96 overflow-y-auto')],
        [
          ul(
            [
              Class(
                'text-sm divide-y divide-gray-200 dark:divide-gray-700',
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
                      OnClick(CloseMobileTableOfContents.make()),
                      Class(
                        classNames(
                          'transition flex items-center justify-between py-3 px-4',
                          {
                            'pl-8': level === 'h3',
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
      GettingStarted: () => Page.GettingStarted.view(model),
      ArchitectureAndConcepts: () =>
        Page.ArchitectureAndConcepts.view(model),
      Routing: () => Page.Routing.view(model),
      Examples: Page.Examples.view,
      BestPractices: () => Page.BestPractices.view(model),
      ProjectOrganization: () => Page.ProjectOrganization.view(model),
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
    M.tag('ArchitectureAndConcepts', () =>
      Option.some(Page.ArchitectureAndConcepts.tableOfContents),
    ),
    M.tag('Routing', () => Option.some(Page.Routing.tableOfContents)),
    M.tag('BestPractices', () =>
      Option.some(Page.BestPractices.tableOfContents),
    ),
    M.tag('ProjectOrganization', () =>
      Option.some(Page.ProjectOrganization.tableOfContents),
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
            'fixed top-0 inset-x-0 z-50 h-[var(--header-height)] bg-gray-100 dark:bg-black border-b border-gray-200 dark:border-gray-700 pl-2 pr-3 md:px-8 flex items-center justify-between',
          ),
        ],
        [
          div(
            [Class('flex items-center gap-2')],
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
              img([
                Src('/logo.svg'),
                Alt('Foldkit'),
                Class('h-6 md:h-8 dark:invert'),
              ]),
            ],
          ),
          div(
            [Class('flex items-center gap-5 md:gap-6')],
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
                  'flex-1 min-w-0 bg-white dark:bg-gray-900',
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
    onUrlRequest: (request) => LinkClicked.make({ request }),
    onUrlChange: (url) => UrlChanged.make({ url }),
  },
})

Runtime.run(application)
