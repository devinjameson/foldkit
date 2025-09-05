import { Array, Data, Effect, Option, pipe, Schema } from 'effect'
import {
  Route,
  fold,
  makeApplication,
  updateConstructors,
  Url,
  UrlRequest,
  Command,
  ApplicationInit,
} from '@foldkit'
import { pushUrl, replaceUrl, load } from '@foldkit/navigation'
import {
  Class,
  Html,
  Href,
  Value,
  Placeholder,
  OnChange,
  div,
  h1,
  h2,
  p,
  a,
  ul,
  li,
  input,
} from '@foldkit/html'
import { slash, literal, int } from '@foldkit/route'

// ROUTE

type AppRoute = Data.TaggedEnum<{
  Home: {}
  Nested: {}
  People: { searchText: Option.Option<string> }
  Person: { personId: number }
  NotFound: { path: string }
}>

const AppRoute = Data.taggedEnum<AppRoute>()

const homeRouter = pipe(Route.root, Route.mapTo(AppRoute.Home))

const nestedRouter = pipe(
  literal('nested'),
  slash(literal('route')),
  slash(literal('is')),
  slash(literal('very')),
  slash(literal('nested')),
  Route.mapTo(AppRoute.Nested),
)

const PeopleQuerySchema = Schema.Struct({
  searchText: Schema.OptionFromUndefinedOr(Schema.String),
})

const peopleRouter = pipe(
  literal('people'),
  Route.query(PeopleQuerySchema),
  Route.mapTo(AppRoute.People),
)

const personRouter = pipe(literal('people'), slash(int('personId')), Route.mapTo(AppRoute.Person))

const routeParser = Route.oneOf(personRouter, peopleRouter, nestedRouter, homeRouter)

const urlToAppRoute = Route.parseUrlWithFallback(routeParser, AppRoute.NotFound)

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
}>

// MESSAGE

type Message = Data.TaggedEnum<{
  NoOp: {}
  UrlRequestReceived: { request: UrlRequest }
  UrlChanged: { url: Url }
  SearchInputChanged: { value: string }
}>

const Message = Data.taggedEnum<Message>()

// INIT

const init: ApplicationInit<Model, Message> = (url: Url) => {
  return [{ route: urlToAppRoute(url) }, Option.none()]
}

// UPDATE

const { identity, pure, pureCommand } = updateConstructors<Model, Message>()

const update = fold<Model, Message>({
  NoOp: identity,

  UrlRequestReceived: pureCommand((model, { request }): [Model, Command<Message>] => {
    return UrlRequest.$match(request, {
      Internal: ({ url }): [Model, Command<Message>] => [
        {
          ...model,
          route: urlToAppRoute(url),
        },
        pushUrl(url.pathname).pipe(Effect.map(() => Message.NoOp())),
      ],
      External: ({ href }): [Model, Command<Message>] => [
        model,
        load(href).pipe(Effect.map(() => Message.NoOp())),
      ],
    })
  }),

  UrlChanged: pure((model, { url }) => ({
    ...model,
    route: urlToAppRoute(url),
  })),

  SearchInputChanged: pureCommand((model, { value }): [Model, Command<Message>] => {
    return [
      model,
      replaceUrl(peopleRouter.build({ searchText: Option.fromNullable(value || null) })).pipe(
        Effect.map(() => Message.NoOp()),
      ),
    ]
  }),
})

// VIEW

const navigationView = (currentRoute: AppRoute): Html => {
  const navLinkClassName = (isActive: boolean) =>
    `hover:bg-blue-600 font-medium px-3 py-1 rounded transition ${isActive ? 'bg-blue-700 bg-opacity-50' : ''}`

  return div(
    [Class('bg-blue-500 text-white p-4 mb-6')],
    [
      div(
        [Class('max-w-4xl mx-auto flex gap-6')],
        [
          a(
            [
              Href(homeRouter.build({})),
              Class(navLinkClassName(AppRoute.$is('Home')(currentRoute))),
            ],
            ['Home'],
          ),
          a(
            [
              Href(peopleRouter.build({ searchText: Option.none() })),
              Class(
                navLinkClassName(
                  AppRoute.$is('People')(currentRoute) || AppRoute.$is('Person')(currentRoute),
                ),
              ),
            ],
            ['People'],
          ),
          a(
            [
              Href(nestedRouter.build({})),
              Class(navLinkClassName(AppRoute.$is('Nested')(currentRoute))),
            ],
            ['Nested'],
          ),
        ],
      ),
    ],
  )
}

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
      p([Class('text-gray-600')]),
    ],
  )

const nestedView = (): Html =>
  div(
    [Class('max-w-4xl mx-auto px-4')],
    [
      h1([Class('text-4xl font-bold text-gray-800 mb-6')], ['Very Nested Route!']),
      p(
        [Class('text-lg text-gray-600')],
        ['You found the deeply nested route at /nested/route/is/very/nested'],
      ),
    ],
  )

const peopleView = (searchText: Option.Option<string>): Html => {
  const filteredPeople = Option.match(searchText, {
    onNone: () => people,
    onSome: (query) =>
      Array.filter(
        people,
        (person) =>
          person.name.toLowerCase().includes(query.toLowerCase()) ||
          person.role.toLowerCase().includes(query.toLowerCase()),
      ),
  })

  return div(
    [Class('max-w-4xl mx-auto px-4')],
    [
      h1([Class('text-4xl font-bold text-gray-800 mb-6')], ['People']),

      div(
        [Class('mb-6')],
        [
          input([
            Value(Option.getOrElse(searchText, () => '')),
            Placeholder('Search by name or role...'),
            Class(
              'w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500',
            ),
            OnChange((value) => Message.SearchInputChanged({ value })),
          ]),
        ],
      ),

      p(
        [Class('text-lg text-gray-600 mb-6')],
        [
          Option.match(searchText, {
            onNone: () => 'Click on any person to view their details:',
            onSome: (query) =>
              `Searching for "${query}" - ${Array.length(filteredPeople)} results:`,
          }),
        ],
      ),
      ul(
        [Class('space-y-3')],
        Array.map(filteredPeople, (person) =>
          li(
            [Class('border border-gray-200 rounded-lg hover:bg-gray-50')],
            [
              a(
                [Href(personRouter.build({ personId: person.id })), Class('block p-4 ')],
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
}

const personView = (personId: number): Html => {
  const person = findPerson(personId)

  return Option.match(person, {
    onNone: () =>
      div(
        [Class('max-w-4xl mx-auto px-4')],
        [
          h1([Class('text-4xl font-bold text-red-600 mb-6')], ['Person Not Found']),
          p([Class('text-lg text-gray-600 mb-4')], [`No person found with ID: ${personId}`]),
          a(
            [
              Href(peopleRouter.build({ searchText: Option.none() })),
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
              Href(peopleRouter.build({ searchText: Option.none() })),
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
      // TODO: Can this just be homeRouter.build()? A little cleaner.
      a([Href(homeRouter.build({})), Class('text-blue-500 hover:underline')], ['← Go Home']),
    ],
  )

const view = (model: Model): Html => {
  const routeContent = AppRoute.$match(model.route, {
    Home: homeView,
    Nested: nestedView,
    People: ({ searchText }) => peopleView(searchText),
    Person: ({ personId }) => personView(personId),
    NotFound: ({ path }) => notFoundView(path),
  })

  return div([Class('min-h-screen bg-gray-100')], [navigationView(model.route), routeContent])
}

// RUN

const app = makeApplication({
  init,
  update,
  view,
  // TODO: Should this be document.getElementById('app') instead?
  container: document.body,
  browser: {
    onUrlRequest: (request) => Message.UrlRequestReceived({ request }),
    onUrlChange: (url) => Message.UrlChanged({ url }),
  },
})

Effect.runFork(app)
