import { Effect, HashSet, Match as M, Schema as S, pipe } from 'effect'
import { Route, Runtime } from 'foldkit'
import {
  AriaLabel,
  Class,
  Href,
  Html,
  InnerHTML,
  OnClick,
  a,
  aside,
  button,
  div,
  empty,
  h1,
  h2,
  header,
  li,
  main,
  nav,
  p,
  pre,
  span,
  strong,
  ul,
} from 'foldkit/html'
import { load, pushUrl } from 'foldkit/navigation'
import { literal } from 'foldkit/route'
import { type ST, ts } from 'foldkit/schema'
import { Url, UrlRequest } from 'foldkit/urlRequest'

import { Icon } from './icon'
import { Link } from './link'
import counterExampleHighlighted from './snippets/counter.ts?highlighted'
import counterExample from './snippets/counter.ts?raw'

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
const gettingStartedRouter = pipe(literal('getting-started'), Route.mapTo(GettingStartedRoute))
const architectureRouter = pipe(literal('architecture'), Route.mapTo(ArchitectureRoute))
const examplesRouter = pipe(literal('examples'), Route.mapTo(ExamplesRoute))
const bestPracticesRouter = pipe(literal('best-practices'), Route.mapTo(BestPracticesRoute))

const routeParser = Route.oneOf(
  gettingStartedRouter,
  architectureRouter,
  examplesRouter,
  bestPracticesRouter,
  homeRouter,
)

const urlToAppRoute = Route.parseUrlWithFallback(routeParser, NotFoundRoute)

// MODEL

const Model = S.Struct({
  route: AppRoute,
  copiedSnippets: S.HashSet(S.String),
})

type Model = ST<typeof Model>

// MESSAGE

const NoOp = ts('NoOp')
const UrlRequestReceived = ts('UrlRequestReceived', { request: UrlRequest })
const UrlChanged = ts('UrlChanged', { url: Url })
const CopyToClipboard = ts('CopyToClipboard', { text: S.String })
const CopySuccess = ts('CopySuccess', { text: S.String })
const HideCopiedIndicator = ts('HideCopiedIndicator', { text: S.String })

const Message = S.Union(
  NoOp,
  UrlRequestReceived,
  UrlChanged,
  CopyToClipboard,
  CopySuccess,
  HideCopiedIndicator,
)

type NoOp = ST<typeof NoOp>
type UrlRequestReceived = ST<typeof UrlRequestReceived>
type UrlChanged = ST<typeof UrlChanged>
type CopyToClipboard = ST<typeof CopyToClipboard>
type CopySuccess = ST<typeof CopySuccess>
type HideCopiedIndicator = ST<typeof HideCopiedIndicator>
type Message = ST<typeof Message>

// INIT

const init: Runtime.ApplicationInit<Model, Message> = (url: Url) => {
  return [
    {
      route: urlToAppRoute(url),
      copiedSnippets: HashSet.empty(),
    },
    [],
  ]
}

// UPDATE

const update = (model: Model, message: Message): [Model, Runtime.Command<Message>[]] =>
  M.value(message).pipe(
    M.withReturnType<[Model, Runtime.Command<Message>[]]>(),
    M.tagsExhaustive({
      NoOp: () => [model, []],

      UrlRequestReceived: ({ request }) =>
        M.value(request).pipe(
          M.tagsExhaustive({
            Internal: ({ url }): [Model, Runtime.Command<NoOp>[]] => [
              {
                ...model,
                route: urlToAppRoute(url),
              },
              [pushUrl(url.pathname).pipe(Effect.as(NoOp.make()))],
            ],
            External: ({ href }): [Model, Runtime.Command<NoOp>[]] => [
              model,
              [load(href).pipe(Effect.as(NoOp.make()))],
            ],
          }),
        ),

      UrlChanged: ({ url }) => [{ ...model, route: urlToAppRoute(url) }, []],

      CopyToClipboard: ({ text }) => [model, [copyToClipboardCommand(text)]],

      CopySuccess: ({ text }) =>
        HashSet.has(model.copiedSnippets, text)
          ? [model, []]
          : [
              { ...model, copiedSnippets: HashSet.add(model.copiedSnippets, text) },
              [hideIndicatorCommand(text)],
            ],

      HideCopiedIndicator: ({ text }) => [
        { ...model, copiedSnippets: HashSet.remove(model.copiedSnippets, text) },
        [],
      ],
    }),
  )

// COMMAND

const copyToClipboardCommand = (text: string): Runtime.Command<CopySuccess | NoOp> =>
  Effect.tryPromise({
    try: () => navigator.clipboard.writeText(text),
    catch: () => new Error('Failed to copy to clipboard'),
  }).pipe(
    Effect.as(CopySuccess.make({ text })),
    Effect.catchAll(() => Effect.succeed(NoOp.make())),
  )

const COPY_INDICATOR_DURATION = '2 seconds'

const hideIndicatorCommand = (text: string): Runtime.Command<HideCopiedIndicator> =>
  Effect.sleep(COPY_INDICATOR_DURATION).pipe(Effect.as(HideCopiedIndicator.make({ text })))

// VIEW

const sidebarView = (currentRoute: AppRoute) => {
  const linkClass = (isActive: boolean) =>
    `block px-4 py-2 rounded transition ${isActive ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-100'}`

  const navLink = (href: string, isActive: boolean, label: string) =>
    li([], [a([Href(href), Class(linkClass(isActive))], [label])])

  return aside(
    [Class('w-64 bg-white border-r border-gray-200 min-h-screen p-6')],
    [
      nav(
        [],
        [
          h2(
            [Class('text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3')],
            ['Documentation'],
          ),
          ul(
            [Class('space-y-1')],
            [
              navLink(homeRouter.build({}), S.is(HomeRoute)(currentRoute), 'Home'),
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
              navLink(examplesRouter.build({}), S.is(ExamplesRoute)(currentRoute), 'Examples'),
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

const CREATE_FOLDKIT_APP_COMMAND = 'npx create-foldkit-app@latest --wizard'

const bulletPoint = (label: string, description: string) =>
  li([], [strong([], [`${label}:`]), ` ${description}`])

const homeView = (model: Model) =>
  div(
    [],
    [
      h1([Class('text-5xl font-bold text-gray-900 mb-4')], ['Foldkit']),
      p(
        [Class('mb-4')],
        [
          'Foldkit is a TypeScript framework for building type-safe, functional web applications (',
          a([Href(Link.websiteSource), Class('text-blue-500 hover:underline')], ['like this one!']),
          '). It uses ',
          a(
            [Href(Link.theElmArchitecture), Class('text-blue-500 hover:underline')],
            ['The Elm Architecture'],
          ),
          ' and is built with ',
          a([Href(Link.effect), Class('text-blue-500 hover:underline')], ['Effect']),
          '.',
        ],
      ),
      p(
        [Class('mb-4')],
        [
          "If you're coming from a framework like ",
          a([Href(Link.react), Class('text-blue-500 hover:underline')], ['React']),
          ', ',
          a([Href(Link.vue), Class('text-blue-500 hover:underline')], ['Vue']),
          ', ',
          a([Href(Link.angular), Class('text-blue-500 hover:underline')], ['Angular']),
          ', ',
          a([Href(Link.svelte), Class('text-blue-500 hover:underline')], ['Svelte']),
          ', or ',
          a([Href(Link.solid), Class('text-blue-500 hover:underline')], ['Solid']),
          ', Foldkit may feel unfamiliar at first. However, once you get used to its patterns and principles, you may find it to be a refreshing and enjoyable way to build web applications.',
        ],
      ),
      p(
        [Class('mb-4')],
        ['The main qualities of Foldkit that differentiate it from other frameworks are:'],
      ),
      ul(
        [Class('list-disc mb-8 space-y-2 ml-4')],
        [
          bulletPoint(
            'The Elm Architecture',
            'Foldkit uses the proven Model-View-Update pattern in The Elm Architecture, providing a clear unidirectional data flow that makes applications predictable and easy to reason about.',
          ),
          bulletPoint(
            'Single slice of state',
            'The entire application state is stored in a single immutable model, making it easier to reason about and manage state changes.',
          ),
          bulletPoint(
            'Controlled side effects',
            'Side effects are managed explicitly through commands, allowing for better control and testing of asynchronous operations. This quality in particular makes Foldkit applications exceptionally clear.',
          ),
          bulletPoint(
            'Functional',
            'Foldkit unapologetically embraces a functional style of programming, promoting immutability, pure functions, and declarative code.',
          ),
          bulletPoint(
            'Built with and for Effect',
            'Foldkit leverages the power of the Effect library to provide a robust and type-safe foundation for building applications.',
          ),
        ],
      ),
      h2([Class('text-2xl font-semibold text-gray-900 mb-4')], ['Quick Start']),
      p(
        [Class('mb-4')],
        [
          a(
            [Href(Link.createFoldkitApp), Class('text-blue-500 hover:underline')],
            ['Create Foldkit app'],
          ),
          " is the recommended way to get started with Foldkit. You'll be able to select the ",
          a([Href(Link.foldkitExamples), Class('text-blue-500 hover:underline')], ['example']),
          " you would like to start with and the package manager you'd like to use.",
        ],
      ),
      div(
        [Class('relative mb-8')],
        [
          pre(
            [Class('bg-gray-900 text-gray-100 rounded-lg text-sm')],
            [CREATE_FOLDKIT_APP_COMMAND],
          ),
          div(
            [Class('absolute top-2 right-2 flex items-center gap-2')],
            [
              HashSet.has(model.copiedSnippets, CREATE_FOLDKIT_APP_COMMAND)
                ? div(
                    [Class('text-sm rounded py-1 px-2 font-medium bg-green-700 text-white')],
                    ['Copied'],
                  )
                : empty,
              button(
                [
                  Class('p-2 rounded hover:bg-gray-700 transition text-gray-400 hover:text-white'),
                  AriaLabel('Copy command to clipboard'),
                  OnClick(CopyToClipboard.make({ text: CREATE_FOLDKIT_APP_COMMAND })),
                ],
                [Icon.copy()],
              ),
            ],
          ),
        ],
      ),
      h2([Class('text-2xl font-semibold text-gray-900 mb-4 mt-8')], ['Counter Example']),
      p(
        [Class('mb-4')],
        [
          "Here's a simple counter application that demonstrates Foldkit's core concepts: the ",
          strong([], ['Model']),
          ' (application state), ',
          strong([], ['Messages']),
          ' (model updates), ',
          strong([], ['Update']),
          ' (state transitions), and ',
          strong([], ['View']),
          ' (rendering).',
        ],
      ),
      div(
        [Class('relative mb-8')],
        [
          div([Class('text-sm'), InnerHTML(counterExampleHighlighted)], []),
          div(
            [Class('absolute top-2 right-2 flex items-center gap-2')],
            [
              HashSet.has(model.copiedSnippets, counterExample)
                ? div(
                    [Class('text-sm rounded py-1 px-2 font-medium bg-green-700 text-white')],
                    ['Copied'],
                  )
                : empty,
              button(
                [
                  Class('p-2 rounded hover:bg-gray-700 transition text-gray-400 hover:text-white'),
                  AriaLabel('Copy counter example to clipboard'),
                  OnClick(CopyToClipboard.make({ text: counterExample })),
                ],
                [Icon.copy()],
              ),
            ],
          ),
        ],
      ),
      a(
        [Href(gettingStartedRouter.build({})), Class('text-blue-500 hover:underline')],
        ['Get Started →'],
      ),
    ],
  )

const gettingStartedView = () =>
  div(
    [],
    [
      h1([Class('text-4xl font-bold text-gray-900 mb-6')], ['Getting Started']),
      p([], ['Learn how to build type-safe, functional web applications with Foldkit.']),
    ],
  )

const architectureView = () =>
  div(
    [],
    [
      h1([Class('text-4xl font-bold text-gray-900 mb-6')], ['Architecture & Concepts']),
      p([], ['Understand the core principles and patterns of Foldkit.']),
    ],
  )

const examplesView = () =>
  div(
    [],
    [
      h1([Class('text-4xl font-bold text-gray-900 mb-6')], ['Examples']),
      p([], ['Explore real-world examples built with Foldkit.']),
    ],
  )

const bestPracticesView = () =>
  div(
    [],
    [
      h1([Class('text-4xl font-bold text-gray-900 mb-6')], ['Best Practices']),
      p([], ['Learn patterns and practices for building maintainable Foldkit applications.']),
    ],
  )

const notFoundView = (path: string) =>
  div(
    [],
    [
      h1([Class('text-4xl font-bold text-red-600 mb-6')], ['404 - Page Not Found']),
      p([Class('mb-4')], [`The path "${path}" was not found.`]),
      a([Href(homeRouter.build({})), Class('text-blue-500 hover:underline')], ['← Go Home']),
    ],
  )

const iconLink = (link: string, ariaLabel: string, icon: Html) =>
  a(
    [Href(link), Class('text-gray-700 hover:text-gray-900 transition'), AriaLabel(ariaLabel)],
    [icon],
  )

const view = (model: Model) => {
  const content = M.value(model.route).pipe(
    M.tagsExhaustive({
      Home: () => homeView(model),
      GettingStarted: gettingStartedView,
      Architecture: architectureView,
      Examples: examplesView,
      BestPractices: bestPracticesView,
      NotFound: ({ path }) => notFoundView(path),
    }),
  )

  return div(
    [],
    [
      div(
        [Class('bg-yellow-500 text-gray-900 text-center py-2 px-4 text-sm font-medium space-x-3')],
        [
          span([], ['🔧']),
          span([], ['We are building in the open! This site is a work in progress.']),
          span([], ['🪛']),
        ],
      ),
      div(
        [Class('flex min-h-screen bg-gray-50')],
        [
          sidebarView(model.route),
          main(
            [Class('flex-1')],
            [
              header(
                [
                  Class(
                    'bg-white border-b border-gray-200 px-8 py-6 flex items-center justify-between',
                  ),
                ],
                [
                  h1([Class('text-2xl font-bold text-gray-900')], ['Foldkit']),
                  div(
                    [Class('flex items-center gap-4')],
                    [
                      iconLink(Link.github, 'GitHub', Icon.github('w-6 h-6')),
                      iconLink(Link.npm, 'npm', Icon.npm('w-8 h-8')),
                    ],
                  ),
                ],
              ),
              div([Class('p-8 max-w-4xl mx-auto')], [content]),
            ],
          ),
        ],
      ),
    ],
  )
}

// RUN

const application = Runtime.makeApplication({
  Model,
  init,
  update,
  view,
  container: document.getElementById('root')!,
  browser: {
    onUrlRequest: (request) => UrlRequestReceived.make({ request }),
    onUrlChange: (url) => UrlChanged.make({ url }),
  },
})

Runtime.run(application)
