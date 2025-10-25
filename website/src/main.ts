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
import {
  AriaLabel,
  Class,
  Href,
  Html,
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
} from 'foldkit/html'
import { load, pushUrl } from 'foldkit/navigation'
import { literal } from 'foldkit/route'
import { UrlRequest } from 'foldkit/runtime'
import { type ST, ts } from 'foldkit/schema'
import { Url, toString as urlToString } from 'foldkit/url'

import * as CommandStream from './commandStream'
import { Icon } from './icon'
import { Link } from './link'
import * as Page from './page'

// ROUTE

const HomeRoute = ts('Home')
const GettingStartedRoute = ts('GettingStarted')
const ArchitectureRoute = ts('Architecture')
const ExamplesRoute = ts('Examples')
const BestPracticesRoute = ts('BestPractices')
const NotFoundRoute = ts('NotFound', { path: S.String })

const AppRoute = S.Union(
  HomeRoute,
  GettingStartedRoute,
  ArchitectureRoute,
  ExamplesRoute,
  BestPracticesRoute,
  NotFoundRoute,
)

type HomeRoute = ST<typeof HomeRoute>
type GettingStartedRoute = ST<typeof GettingStartedRoute>
type ArchitectureRoute = ST<typeof ArchitectureRoute>
type ExamplesRoute = ST<typeof ExamplesRoute>
type BestPracticesRoute = ST<typeof BestPracticesRoute>
type NotFoundRoute = ST<typeof NotFoundRoute>
type AppRoute = ST<typeof AppRoute>

const homeRouter = pipe(Route.root, Route.mapTo(HomeRoute))
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

// MODEL

export const Model = S.Struct({
  route: AppRoute,
  url: Url,
  copiedSnippets: S.HashSet(S.String),
  mobileMenuOpen: S.Boolean,
  activeSection: S.Option(S.String),
})

export type Model = ST<typeof Model>

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
)

type NoOp = ST<typeof NoOp>
type LinkClicked = ST<typeof LinkClicked>
type UrlChanged = ST<typeof UrlChanged>
type CopySnippetToClipboard = ST<typeof CopySnippetToClipboard>
type CopyLinkToClipboard = ST<typeof CopyLinkToClipboard>
type CopySuccess = ST<typeof CopySuccess>
type HideCopiedIndicator = ST<typeof HideCopiedIndicator>
type ToggleMobileMenu = ST<typeof ToggleMobileMenu>
export type ActiveSectionChanged = ST<typeof ActiveSectionChanged>
type Message = ST<typeof Message>

// INIT

const init: Runtime.ApplicationInit<Model, Message> = (url: Url) => {
  return [
    {
      route: urlToAppRoute(url),
      url,
      copiedSnippets: HashSet.empty(),
      mobileMenuOpen: false,
      activeSection: Option.none(),
    },
    Option.match(url.hash, {
      onNone: () => [],
      onSome: (hash) => [scrollToHash(hash)],
    }),
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
              [pushUrl(url.pathname).pipe(Effect.as(NoOp.make()))],
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
        {
          ...model,
          route: urlToAppRoute(url),
          url,
          mobileMenuOpen: false,
        },
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
              {
                ...model,
                copiedSnippets: HashSet.add(
                  model.copiedSnippets,
                  text,
                ),
              },
              [hideIndicator(text)],
            ],

      HideCopiedIndicator: ({ text }) => [
        {
          ...model,
          copiedSnippets: HashSet.remove(model.copiedSnippets, text),
        },
        [],
      ],

      ToggleMobileMenu: () => [
        { ...model, mobileMenuOpen: !model.mobileMenuOpen },
        [],
      ],

      ActiveSectionChanged: ({ sectionId }) => [
        { ...model, activeSection: Option.some(sectionId) },
        [],
      ],
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

// VIEW

const sidebarView = (
  currentRoute: AppRoute,
  mobileMenuOpen: boolean,
) => {
  const linkClass = (isActive: boolean) =>
    classNames('block px-2 py-1 rounded transition text-sm', {
      'bg-blue-100 text-blue-700': isActive,
      'text-gray-700 hover:bg-gray-100': !isActive,
    })

  const navLink = (href: string, isActive: boolean, label: string) =>
    li([], [a([Href(href), Class(linkClass(isActive))], [label])])

  return aside(
    [
      Class(
        classNames(
          'absolute md:static top-0 left-0 bottom-0 z-40',
          'w-full md:w-64 bg-white border-r border-gray-200 p-4',
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
                'text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3',
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
      Class('text-gray-700 hover:text-gray-900 transition'),
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
        'hidden xl:block w-64 overflow-y-auto border-l border-gray-200 p-4',
      ),
    ],
    [
      h3(
        [
          Class(
            'text-xs font-semibold text-gray-900 uppercase tracking-wider mb-2',
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
                          'text-blue-600 underline': isActive,
                          'text-gray-600 hover:text-gray-900':
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
      GettingStarted: () => Page.GettingStarted.view(model),
      Architecture: () => Page.Architecture.view(model),
      Examples: Page.Examples.view,
      BestPractices: Page.BestPractices.view,
      NotFound: ({ path }) =>
        Page.NotFound.view(path, homeRouter.build({})),
    }),
  )

  const currentPageTableOfContents = M.value(model.route).pipe(
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
            'bg-yellow-500 text-gray-900 text-center py-2 px-4 text-xs md:text-sm font-medium space-x-2 md:space-x-3',
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
            'bg-white border-b border-gray-200 px-4 md:px-8 py-4 md:py-6 flex items-center justify-between',
          ),
        ],
        [
          div(
            [Class('flex items-center gap-4')],
            [
              button(
                [
                  Class(
                    'md:hidden p-2 rounded hover:bg-gray-100 transition text-gray-700',
                  ),
                  AriaLabel('Toggle menu'),
                  OnClick(ToggleMobileMenu.make()),
                ],
                [Icon.menu('w-6 h-6')],
              ),
              h1(
                [
                  Class(
                    'text-xl md:text-2xl font-bold text-gray-900',
                  ),
                ],
                ['Foldkit'],
              ),
            ],
          ),
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
      div(
        [Class('flex flex-1 overflow-hidden')],
        [
          sidebarView(model.route, model.mobileMenuOpen),
          main(
            [Class('flex-1 min-w-0 overflow-y-auto')],
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
})

export type CommandStreamsDeps = ST<typeof CommandStreamsDeps>

const commandStreams = Runtime.makeCommandStreams(CommandStreamsDeps)<
  Model,
  Message
>({
  activeSection: CommandStream.activeSection,
})

// RUN

const application = Runtime.makeApplication({
  Model,
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
