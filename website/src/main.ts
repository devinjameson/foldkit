import { Effect, Match as M, Schema as S, pipe } from 'effect'
import { Route, Runtime } from 'foldkit'
import { Class, Href, a, aside, div, h1, h2, header, li, main, nav, p, pre, ul } from 'foldkit/html'
import { load, pushUrl } from 'foldkit/navigation'
import { literal } from 'foldkit/route'
import { type ST, ts } from 'foldkit/schema'
import { Url, UrlRequest } from 'foldkit/urlRequest'

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
})

type Model = ST<typeof Model>

// MESSAGE

const NoOp = ts('NoOp')
const UrlRequestReceived = ts('UrlRequestReceived', { request: UrlRequest })
const UrlChanged = ts('UrlChanged', { url: Url })

const Message = S.Union(NoOp, UrlRequestReceived, UrlChanged)

type NoOp = ST<typeof NoOp>
type UrlRequestReceived = ST<typeof UrlRequestReceived>
type UrlChanged = ST<typeof UrlChanged>
type Message = ST<typeof Message>

// INIT

const init: Runtime.ApplicationInit<Model, Message> = (url: Url) => {
  return [{ route: urlToAppRoute(url) }, []]
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
    }),
  )

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

const homeView = () =>
  div(
    [],
    [
      h1([Class('text-5xl font-bold text-gray-900 mb-4')], ['Foldkit']),
      p(
        [Class('text-xl text-gray-600 mb-8')],
        ['Build type-safe, functional web applications with the Elm Architecture and Effect.'],
      ),
      h2([Class('text-2xl font-semibold text-gray-900 mb-4')], ['Quick Start']),
      pre(
        [Class('bg-gray-900 text-gray-100 p-4 rounded-lg mb-8 overflow-x-auto')],
        ['npx create-foldkit-app@latest --wizard'],
      ),
      p([Class('text-gray-600 mb-4')], ['Or check out a simple counter example:']),
      a(
        [Href(gettingStartedRouter.build({})), Class('text-blue-500 hover:underline text-lg')],
        ['Get Started →'],
      ),
    ],
  )

const gettingStartedView = () =>
  div(
    [],
    [
      h1([Class('text-4xl font-bold text-gray-900 mb-6')], ['Getting Started']),
      p(
        [Class('text-lg text-gray-600')],
        ['Learn how to build type-safe, functional web applications with Foldkit.'],
      ),
    ],
  )

const architectureView = () =>
  div(
    [],
    [
      h1([Class('text-4xl font-bold text-gray-900 mb-6')], ['Architecture & Concepts']),
      p(
        [Class('text-lg text-gray-600')],
        ['Understand the core principles and patterns of Foldkit.'],
      ),
    ],
  )

const examplesView = () =>
  div(
    [],
    [
      h1([Class('text-4xl font-bold text-gray-900 mb-6')], ['Examples']),
      p([Class('text-lg text-gray-600')], ['Explore real-world examples built with Foldkit.']),
    ],
  )

const bestPracticesView = () =>
  div(
    [],
    [
      h1([Class('text-4xl font-bold text-gray-900 mb-6')], ['Best Practices']),
      p(
        [Class('text-lg text-gray-600')],
        ['Learn patterns and practices for building maintainable Foldkit applications.'],
      ),
    ],
  )

const notFoundView = (path: string) =>
  div(
    [],
    [
      h1([Class('text-4xl font-bold text-red-600 mb-6')], ['404 - Page Not Found']),
      p([Class('text-lg text-gray-600 mb-4')], [`The path "${path}" was not found.`]),
      a([Href(homeRouter.build({})), Class('text-blue-500 hover:underline')], ['← Go Home']),
    ],
  )

const view = (model: Model) => {
  const content = M.value(model.route).pipe(
    M.tagsExhaustive({
      Home: homeView,
      GettingStarted: gettingStartedView,
      Architecture: architectureView,
      Examples: examplesView,
      BestPractices: bestPracticesView,
      NotFound: ({ path }) => notFoundView(path),
    }),
  )

  return div(
    [Class('flex min-h-screen bg-gray-50')],
    [
      sidebarView(model.route),
      main(
        [Class('flex-1')],
        [
          header(
            [Class('bg-white border-b border-gray-200 px-8 py-6')],
            [h1([Class('text-2xl font-bold text-gray-900')], ['Foldkit'])],
          ),
          div([Class('p-8 max-w-4xl')], [content]),
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
