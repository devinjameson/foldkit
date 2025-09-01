import { Array, Data, Effect, Option, pipe } from 'effect'
import { Route, fold, makeApp, updateConstructors, Init } from '@foldkit'
import { Class, Html, OnClick, Href, div, h1, h2, p, a, ul, li } from '@foldkit/html'

type AppRoute = Data.TaggedEnum<{
  Home: {}
  People: {}
  Person: { id: number }
  NotFound: { path: string }
}>

const AppRoute = Data.taggedEnum<AppRoute>()

const homeRouteParser = pipe(
  Route.root,
  Route.map(() => AppRoute.Home()),
)

const peopleRouteParser = pipe(
  Route.s('people'),
  Route.map(() => AppRoute.People()),
)

const personRouteParser = pipe(
  Route.s('people'),
  Route.slash(Route.int),
  Route.map(([, id]) => AppRoute.Person({ id })),
)

const routerParser: Route.Parser<AppRoute> = Route.oneOf<AppRoute>([
  personRouteParser,
  peopleRouteParser,
  homeRouteParser,
])

// CLAUDE: Should foldkit provide this and if the user wants they can make their
// own? Elm does that right?
const urlToAppRoute = (path: string) =>
  pipe(
    path,
    Route.parseUrl(routerParser),
    Effect.orElse(() => Effect.succeed(AppRoute.NotFound({ path }))),
    Effect.runSync,
  )

const people = [
  { id: 1, name: 'Alice Johnson', role: 'Designer' },
  { id: 2, name: 'Bob Smith', role: 'Developer' },
  { id: 3, name: 'Carol Davis', role: 'Manager' },
  { id: 4, name: 'David Wilson', role: 'Developer' },
  { id: 5, name: 'Eva Brown', role: 'Designer' },
]

const findPerson = (id: number) => Array.findFirst(people, (person) => person.id === id)

// MODEL

type Model = Readonly<{
  route: AppRoute
  path: string
}>

// MESSAGE

type Message = Data.TaggedEnum<{
  NoOp: {}
  NavigateTo: { path: string }
  UrlChanged: { path: string }
}>

const Message = Data.taggedEnum<Message>()

// INIT

const init: Init<Model, Message> = () => {
  // CLAUDE: We should do this how Elm does it
  const currentPath = window.location.pathname
  // CLAUDE: Also how does Elm do this initial route?
  const route = urlToAppRoute(currentPath)

  return [
    {
      route,
      path: currentPath,
    },
    Option.none(),
  ]
}

// UPDATE

const { pure } = updateConstructors<Model, Message>()

const update = fold<Model, Message>({
  NoOp: pure((model) => model),

  NavigateTo: pure((model, { path }) => {
    // CLAUDE: This should happen in foldkit internals right?
    window.history.pushState({}, '', path)

    return {
      ...model,
      route: urlToAppRoute(path),
      path,
    }
  }),

  UrlChanged: pure((model, { path }) => ({
    ...model,
    route: urlToAppRoute(path),
    path,
  })),
})

// VIEW

const navigationView = (): Html =>
  div(
    [Class('bg-blue-500 text-white p-4 mb-6')],
    [
      div(
        [Class('max-w-4xl mx-auto flex gap-6')],
        [
          a(
            [
              Href('/'),
              OnClick(Message.NavigateTo({ path: '/' })),
              Class('hover:underline font-medium'),
            ],
            ['Home'],
          ),
          a(
            [
              Href('/people'),
              OnClick(Message.NavigateTo({ path: '/people' })),
              Class('hover:underline font-medium'),
            ],
            ['People'],
          ),
        ],
      ),
    ],
  )

const homeView = (): Html =>
  div(
    [Class('max-w-4xl mx-auto px-4')],
    [
      h1([Class('text-4xl font-bold text-gray-800 mb-6')], ['Welcome Home']),
      p(
        [Class('text-lg text-gray-600 mb-4')],
        [
          'This is a routing example built with foldkit. Navigate using the links above to see different routes in action.',
        ],
      ),
      p(
        [Class('text-gray-600')],
        [
          'The routing system uses Effect-TS parser combinators for composable, type-safe URL parsing with detailed error handling.',
        ],
      ),
    ],
  )

const peopleView = (): Html =>
  div(
    [Class('max-w-4xl mx-auto px-4')],
    [
      h1([Class('text-4xl font-bold text-gray-800 mb-6')], ['People']),
      p([Class('text-lg text-gray-600 mb-6')], ['Click on any person to view their details:']),
      ul(
        [Class('space-y-3')],
        Array.map(people, (person) =>
          li(
            [Class('border border-gray-200 rounded-lg p-4 hover:bg-gray-50')],
            [
              a(
                [
                  Href(`/people/${person.id}`),
                  OnClick(Message.NavigateTo({ path: `/people/${person.id}` })),
                  Class('block'),
                ],
                [
                  div(
                    [Class('flex justify-between items-center')],
                    [
                      h2([Class('text-xl font-semibold text-gray-800')], [person.name]),
                      p([Class('text-gray-600')], [person.role]),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    ],
  )

const personView = (id: number): Html => {
  const person = findPerson(id)

  return Option.match(person, {
    onNone: () =>
      div(
        [Class('max-w-4xl mx-auto px-4')],
        [
          h1([Class('text-4xl font-bold text-red-600 mb-6')], ['Person Not Found']),
          p([Class('text-lg text-gray-600 mb-4')], [`No person found with ID: ${id}`]),
          a(
            [
              Href('/people'),
              OnClick(Message.NavigateTo({ path: '/people' })),
              Class('text-blue-500 hover:underline'),
            ],
            ['← Back to People'],
          ),
        ],
      ),

    onSome: (person) =>
      div(
        [Class('max-w-4xl mx-auto px-4')],
        [
          a(
            [
              Href('/people'),
              OnClick(Message.NavigateTo({ path: '/people' })),
              Class('text-blue-500 hover:underline mb-4 inline-block'),
            ],
            ['← Back to People'],
          ),

          h1([Class('text-4xl font-bold text-gray-800 mb-6')], [person.name]),

          div(
            [Class('bg-gray-50 border border-gray-200 rounded-lg p-6')],
            [
              div(
                [Class('grid grid-cols-2 gap-4')],
                [
                  div(
                    [],
                    [
                      h2(
                        [Class('text-sm font-medium text-gray-500 uppercase tracking-wide')],
                        ['ID'],
                      ),
                      p([Class('text-lg text-gray-900 mt-1')], [String(person.id)]),
                    ],
                  ),
                  div(
                    [],
                    [
                      h2(
                        [Class('text-sm font-medium text-gray-500 uppercase tracking-wide')],
                        ['Role'],
                      ),
                      p([Class('text-lg text-gray-900 mt-1')], [person.role]),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
  })
}

const notFoundView = (path: string): Html =>
  div(
    [Class('max-w-4xl mx-auto px-4')],
    [
      h1([Class('text-4xl font-bold text-red-600 mb-6')], ['404 - Page Not Found']),
      p([Class('text-lg text-gray-600 mb-4')], [`The path "${path}" was not found.`]),
      a(
        [
          Href('/'),
          OnClick(Message.NavigateTo({ path: '/' })),
          Class('text-blue-500 hover:underline'),
        ],
        ['← Go Home'],
      ),
    ],
  )

const view = (model: Model): Html => {
  const routeContent = AppRoute.$match(model.route, {
    Home: homeView,
    People: peopleView,
    Person: ({ id }) => personView(id),
    NotFound: ({ path }) => notFoundView(path),
  })

  return div([Class('min-h-screen bg-gray-100')], [navigationView(), routeContent])
}

// RUN

const app = makeApp({
  init,
  update,
  view,
  container: document.body,
})

Effect.runFork(app)
