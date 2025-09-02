import { Array, Data, Effect, Option, pipe, Schema, String as S } from 'effect'
import {
  Route,
  fold,
  makeApplication,
  updateConstructors,
  makeCommand,
  Url,
  UrlRequest,
  Command,
  ApplicationInit,
} from '@foldkit'
import { pushUrl, replaceUrl } from '@foldkit/navigation'
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

type AppRoute = Data.TaggedEnum<{
  Home: {}
  People: { searchText: Option.Option<string> }
  Person: { personId: number }
  NotFound: { path: string }
}>

const AppRoute = Data.taggedEnum<AppRoute>()

const homeRouteParser = pipe(
  Route.root,
  Route.map(() => AppRoute.Home()),
)

const PeopleQuerySchema = Schema.Struct({
  searchText: Schema.OptionFromUndefinedOr(Schema.String),
})

const peopleRouteParser = pipe(
  Route.s('people'),
  Route.query(PeopleQuerySchema),
  Route.map(({ searchText }) => AppRoute.People({ searchText })),
)

const personRouteParser = pipe(
  Route.s('people'),
  Route.slash(Route.int('personId')),
  Route.map(({ personId }) => AppRoute.Person({ personId })),
)

const routeParser: Route.Parser<AppRoute> = Route.oneOf<AppRoute>([
  personRouteParser,
  peopleRouteParser,
  homeRouteParser,
])

const urlToAppRoute = (url: Url) =>
  pipe(
    url,
    Route.parseUrl(routeParser),
    Effect.orElse(() => Effect.succeed(AppRoute.NotFound({ path: url.pathname }))),
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

// TODO: Replace this with a Url bulder
const buildPeopleUrl = (searchText?: string) =>
  searchText ? `/people?searchText=${encodeURIComponent(searchText)}` : '/people'

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

const { pure, pureCommand } = updateConstructors<Model, Message>()

const update = fold<Model, Message>({
  NoOp: pure((model) => model),

  UrlRequestReceived: pureCommand((model, { request }): [Model, Command<Message>] => {
    return UrlRequest.$match(request, {
      Internal: ({ url }): [Model, Command<Message>] => [
        {
          ...model,
          route: urlToAppRoute(url),
        },
        makeCommand(pushUrl(url.pathname).pipe(Effect.map(() => Message.NoOp()))),
      ],
      External: ({ href }): [Model, Command<Message>] => [
        model,
        // TODO: Export a way to do this from foldkit
        makeCommand(
          Effect.sync(() => {
            window.location.assign(href)
            return Message.NoOp()
          }),
        ),
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
      makeCommand(
        replaceUrl(buildPeopleUrl(S.trim(value) || undefined)).pipe(
          Effect.map(() => Message.NoOp()),
        ),
      ),
    ]
  }),
})

// VIEW

const navigationView = (): Html =>
  div(
    [Class('bg-blue-500 text-white p-4 mb-6')],
    [
      div(
        [Class('max-w-4xl mx-auto flex gap-6')],
        [
          a([Href('/'), Class('hover:underline font-medium')], ['Home']),
          a([Href('/people'), Class('hover:underline font-medium')], ['People']),
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
      p([Class('text-gray-600')]),
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
                [Href(`/people/${person.id}`), Class('block p-4 ')],
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
          a([Href('/people'), Class('text-blue-500 hover:underline')], ['← Back to People']),
        ],
      ),

    onSome: (person) =>
      div(
        [Class('max-w-4xl mx-auto px-4')],
        [
          a(
            [Href('/people'), Class('text-blue-500 hover:underline mb-4 inline-block')],
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
      a([Href('/'), Class('text-blue-500 hover:underline')], ['← Go Home']),
    ],
  )

const view = (model: Model): Html => {
  const routeContent = AppRoute.$match(model.route, {
    Home: homeView,
    People: ({ searchText }) => peopleView(searchText),
    Person: ({ personId }) => personView(personId),
    NotFound: ({ path }) => notFoundView(path),
  })

  return div([Class('min-h-screen bg-gray-100')], [navigationView(), routeContent])
}

// RUN

const app = makeApplication({
  init,
  update,
  view,
  container: document.body,
  browser: {
    onUrlRequest: (request) => Message.UrlRequestReceived({ request }),
    onUrlChange: (url) => Message.UrlChanged({ url }),
  },
})

Effect.runFork(app)
