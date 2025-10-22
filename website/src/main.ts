import classNames from 'classnames'
import {
  Array,
  Effect,
  HashSet,
  Match as M,
  Schema as S,
  pipe,
} from 'effect'
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
  code,
  div,
  em,
  empty,
  h1,
  h2,
  h3,
  header,
  li,
  main,
  nav,
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
import {
  bulletPoint,
  bullets,
  heading,
  link,
  para,
  section,
} from './prose'
import * as Snippets from './snippets'

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

// MODEL

const Model = S.Struct({
  route: AppRoute,
  copiedSnippets: S.HashSet(S.String),
  mobileMenuOpen: S.Boolean,
})

type Model = ST<typeof Model>

// MESSAGE

const NoOp = ts('NoOp')
const UrlRequestReceived = ts('UrlRequestReceived', {
  request: UrlRequest,
})
const UrlChanged = ts('UrlChanged', { url: Url })
const CopyToClipboard = ts('CopyToClipboard', { text: S.String })
const CopySuccess = ts('CopySuccess', { text: S.String })
const HideCopiedIndicator = ts('HideCopiedIndicator', {
  text: S.String,
})
const ToggleMobileMenu = ts('ToggleMobileMenu')

const Message = S.Union(
  NoOp,
  UrlRequestReceived,
  UrlChanged,
  CopyToClipboard,
  CopySuccess,
  HideCopiedIndicator,
  ToggleMobileMenu,
)

type NoOp = ST<typeof NoOp>
type UrlRequestReceived = ST<typeof UrlRequestReceived>
type UrlChanged = ST<typeof UrlChanged>
type CopyToClipboard = ST<typeof CopyToClipboard>
type CopySuccess = ST<typeof CopySuccess>
type HideCopiedIndicator = ST<typeof HideCopiedIndicator>
type ToggleMobileMenu = ST<typeof ToggleMobileMenu>
type Message = ST<typeof Message>

// INIT

const init: Runtime.ApplicationInit<Model, Message> = (url: Url) => {
  return [
    {
      route: urlToAppRoute(url),
      copiedSnippets: HashSet.empty(),
      mobileMenuOpen: false,
    },
    [],
  ]
}

// UPDATE

const update = (
  model: Model,
  message: Message,
): [Model, Runtime.Command<Message>[]] =>
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
            External: ({
              href,
            }): [Model, Runtime.Command<NoOp>[]] => [
              model,
              [load(href).pipe(Effect.as(NoOp.make()))],
            ],
          }),
        ),

      UrlChanged: ({ url }) => [
        {
          ...model,
          route: urlToAppRoute(url),
          mobileMenuOpen: false,
        },
        [],
      ],

      CopyToClipboard: ({ text }) => [model, [copyToClipboard(text)]],

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
    }),
  )

// COMMAND

const copyToClipboard = (
  text: string,
): Runtime.Command<CopySuccess | NoOp> =>
  Effect.tryPromise({
    try: () => navigator.clipboard.writeText(text),
    catch: () => new Error('Failed to copy to clipboard'),
  }).pipe(
    Effect.as(CopySuccess.make({ text })),
    Effect.catchAll(() => Effect.succeed(NoOp.make())),
  )

const COPY_INDICATOR_DURATION = '2 seconds'

const hideIndicator = (
  text: string,
): Runtime.Command<HideCopiedIndicator> =>
  Effect.sleep(COPY_INDICATOR_DURATION).pipe(
    Effect.as(HideCopiedIndicator.make({ text })),
  )

// VIEW

const sidebarView = (
  currentRoute: AppRoute,
  mobileMenuOpen: boolean,
) => {
  const linkClass = (isActive: boolean) =>
    classNames('block px-4 py-2 rounded transition', {
      'bg-blue-100 text-blue-700 font-medium': isActive,
      'text-gray-700 hover:bg-gray-100': !isActive,
    })

  const navLink = (href: string, isActive: boolean, label: string) =>
    li([], [a([Href(href), Class(linkClass(isActive))], [label])])

  return aside(
    [
      Class(
        classNames(
          'absolute md:static top-0 left-0 bottom-0 z-40',
          'w-full md:w-64 bg-white border-r border-gray-200 p-6',
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

const CREATE_FOLDKIT_APP_COMMAND =
  'npx create-foldkit-app@latest --wizard'

type Header = { id: string; text: string }
type TableOfContentsEntry = Header & { level: 2 | 3 }

const counterExampleHeader: Header = {
  id: 'counterExample',
  text: 'A Simple Counter Example',
}
const modelHeader: Header = { id: 'model', text: 'Model' }
const messagesHeader: Header = { id: 'messages', text: 'Messages' }
const updateHeader: Header = { id: 'update', text: 'Update' }
const viewHeader: Header = { id: 'view', text: 'View' }
const commandsHeader: Header = { id: 'commands', text: 'Commands' }

const architectureTableOfContents: TableOfContentsEntry[] = [
  { level: 2, ...counterExampleHeader },
  { level: 2, ...modelHeader },
  { level: 2, ...messagesHeader },
  { level: 2, ...updateHeader },
  { level: 2, ...viewHeader },
  { level: 2, ...commandsHeader },
]

const homeView = () =>
  div(
    [],
    [
      heading(1, 'introduction', 'Introduction'),
      para(
        'Foldkit is a TypeScript framework for building type-safe, functional web applications (',
        link(Link.websiteSource, 'like this one!'),
        '). It uses ',
        link(Link.theElmArchitecture, 'The Elm Architecture'),
        ' and is built with ',
        link(Link.effect, 'Effect'),
        '.',
      ),
      para(
        "If you're coming from a framework like ",
        link(Link.react, 'React'),
        ', ',
        link(Link.vue, 'Vue'),
        ', ',
        link(Link.angular, 'Angular'),
        ', ',
        link(Link.svelte, 'Svelte'),
        ', or ',
        link(Link.solid, 'Solid'),
        ', Foldkit may feel unfamiliar at first. However, once you get used to its patterns and principles, you may find it to be a refreshing and enjoyable way to build web applications.',
      ),
      para(
        'The main qualities of Foldkit that differentiate it from other frameworks are:',
      ),
      bullets(
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
      ),
    ],
  )

const gettingStartedView = (model: Model) =>
  div(
    [],
    [
      heading(1, 'gettingStarted', 'Getting Started'),
      heading(2, 'quickStart', 'Quick Start'),
      para(
        link(Link.createFoldkitApp, 'Create Foldkit app'),
        " is the recommended way to get started with Foldkit. You'll be able to select the ",
        link(Link.foldkitExamples, 'example'),
        " you would like to start with and the package manager you'd like to use.",
      ),
      codeBlockWithCopy(
        pre(
          [Class('bg-gray-900 text-gray-100 rounded-lg text-sm')],
          [CREATE_FOLDKIT_APP_COMMAND],
        ),
        CREATE_FOLDKIT_APP_COMMAND,
        'Copy command to clipboard',
        model,
      ),
    ],
  )

const architectureView = (model: Model) =>
  div(
    [],
    [
      heading(1, 'architecture', 'Architecture & Concepts'),
      heading(2, counterExampleHeader.id, counterExampleHeader.text),
      para(
        'The easiest way to learn how Foldkit works is to first look at examples, then dive deeper to understand each piece in isolation.',
      ),
      para(
        "Here's a simple counter application that demonstrates Foldkit's core concepts: the ",
        strong([], ['Model']),
        ' (application state), ',
        strong([], ['Messages']),
        ' (model updates), ',
        strong([], ['Update']),
        ' (state transitions), and ',
        strong([], ['View']),
        ' (rendering). Take a look at the counter example below in full, then continue to see a more detailed explanation of each piece.',
      ),
      codeBlockWithCopy(
        div(
          [Class('text-sm'), InnerHTML(Snippets.counterHighlighted)],
          [],
        ),
        Snippets.counterRaw,
        'Copy counter example to clipboard',
        model,
      ),
      section(modelHeader.id, modelHeader.text, [
        para(
          'The Model represents your entire application state in a single, immutable data structure. In Foldkit, the Model is defined using ',
          link(Link.effectSchema, 'Effect Schema'),
          ', which provides runtime validation, type inference, and a single source of truth for your application state.',
        ),
        para('In the counter example, the model is simply a number.'),
        codeBlockWithCopy(
          div(
            [
              Class('text-sm'),
              InnerHTML(Snippets.counterModelHighlighted),
            ],
            [],
          ),
          Snippets.counterModelRaw,
          'Copy model example to clipboard',
          model,
        ),
      ]),
      section(messagesHeader.id, messagesHeader.text, [
        para(
          'Messages represent all the events that can occur in your application. They describe ',
          em([], ['what happened']),
          ', not ',
          em([], ['how to handle it']),
          '. Messages are implemented as tagged unions, providing exhaustive pattern matching and type safety.',
        ),
        para('The counter example has three simple messages:'),
        codeBlockWithCopy(
          div(
            [
              Class('text-sm'),
              InnerHTML(Snippets.counterMessagesHighlighted),
            ],
            [],
          ),
          Snippets.counterMessagesRaw,
          'Copy messages example to clipboard',
          model,
        ),
      ]),
      section(updateHeader.id, updateHeader.text, [
        para(
          "The update function is the heart of your application logic. It's a pure function that takes the current model and a message, and returns a new model along with any commands to execute. Commands represent side effects and are covered later on this page.",
        ),
        para(
          'Foldkit uses ',
          link(Link.effectMatch, 'Effect.Match'),
          ' for exhaustive pattern matching on messages. The TypeScript compiler will error if you forget to handle a message type.',
        ),
        codeBlockWithCopy(
          div(
            [
              Class('text-sm'),
              InnerHTML(Snippets.counterUpdateHighlighted),
            ],
            [],
          ),
          Snippets.counterUpdateRaw,
          'Copy update example to clipboard',
          model,
        ),
      ]),
      section(viewHeader.id, viewHeader.text, [
        para(
          'The view function is a pure function that transforms your model into HTML. Given the same model, it always produces the same HTML output. The view never directly modifies state - instead, it dispatches messages through event handlers like ',
          code([], ['OnClick']),
          '.',
        ),
        codeBlockWithCopy(
          div(
            [
              Class('text-sm'),
              InnerHTML(Snippets.counterViewHighlighted),
            ],
            [],
          ),
          Snippets.counterViewRaw,
          'Copy view example to clipboard',
          model,
        ),
      ]),
      section(commandsHeader.id, commandsHeader.text, [
        para(
          "You're probably wondering how to handle side effects like HTTP requests, timers, or interacting with the browser API. In Foldkit, side effects are managed through commands returned by the update function. This keeps your update logic pure and testable.",
        ),
        para(
          "Let's start simple. Say we want to wait one second before resetting the count if the user clicks reset. This is how we might implement that:",
        ),
        codeBlockWithCopy(
          div(
            [
              Class('text-sm'),
              InnerHTML(Snippets.counterCommandsHighlighted),
            ],
            [],
          ),
          Snippets.counterCommandsRaw,
          'Copy commands example to clipboard',
          model,
        ),
        para(
          'Now, what if we want to get the next count from an API instead of incrementing locally? We can create a Command that performs the HTTP request and returns a Message when it completes:',
        ),
        codeBlockWithCopy(
          div(
            [
              Class('text-sm'),
              InnerHTML(Snippets.counterHttpCommandHighlighted),
            ],
            [],
          ),
          Snippets.counterHttpCommandRaw,
          'Copy HTTP command example to clipboard',
          model,
        ),
        para(
          "Let's zoom in on ",
          code([], ['fetchCount']),
          " to understand what's happening here:",
        ),
        codeBlockWithCopy(
          div(
            [
              Class('text-sm'),
              InnerHTML(
                Snippets.counterHttpCommandFetchCountHighlighted,
              ),
            ],
            [],
          ),
          Snippets.counterHttpCommandFetchCountRaw,
          'Copy HTTP command fetchCount example to clipboard',
          model,
        ),
      ]),
    ],
  )

const examplesView = () =>
  div(
    [],
    [
      heading(1, 'examples', 'Examples'),
      para('Explore real-world examples built with Foldkit.'),
    ],
  )

const bestPracticesView = () =>
  div(
    [],
    [
      heading(1, 'bestPractices', 'Best Practices'),
      para(
        'Learn patterns and practices for building maintainable Foldkit applications.',
      ),
    ],
  )

const notFoundView = (path: string) =>
  div(
    [],
    [
      h1(
        [Class('text-2xl md:text-4xl font-bold text-red-600 mb-6')],
        ['404 - Page Not Found'],
      ),
      para(`The path "${path}" was not found.`),
      link(homeRouter.build({}), '← Go Home'),
    ],
  )

const codeBlockWithCopy = (
  content: Html,
  textToCopy: string,
  ariaLabel: string,
  model: Model,
) => {
  const copiedIndicator = HashSet.has(
    model.copiedSnippets,
    textToCopy,
  )
    ? div(
        [
          Class(
            'text-sm rounded py-1 px-2 font-medium bg-green-700 text-white',
          ),
        ],
        ['Copied'],
      )
    : empty

  const copyButton = button(
    [
      Class(
        'p-2 rounded hover:bg-gray-700 transition text-gray-400 hover:text-white bg-gray-800',
      ),
      AriaLabel(ariaLabel),
      OnClick(CopyToClipboard.make({ text: textToCopy })),
    ],
    [Icon.copy()],
  )

  const copyButtonWithIndicator = div(
    [Class('absolute top-2 right-2 flex items-center gap-2')],
    [copiedIndicator, copyButton],
  )

  return div(
    [Class('relative mb-8 min-w-0')],
    [content, copyButtonWithIndicator],
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

const tableOfContentsView = (entries: TableOfContentsEntry[]) =>
  aside(
    [
      Class(
        'hidden xl:block fixed right-8 top-24 w-64 max-h-[calc(100vh-6rem)] overflow-y-auto',
      ),
    ],
    [
      h3(
        [
          Class(
            'text-xs font-semibold text-gray-900 uppercase tracking-wider mb-4',
          ),
        ],
        ['On This Page'],
      ),
      nav(
        [],
        [
          ul(
            [Class('space-y-2 text-sm')],
            Array.map(entries, ({ level, id, text }) =>
              li(
                [Class(classNames({ 'ml-4': level === 3 }))],
                [
                  a(
                    [
                      Href(`#${id}`),
                      Class(
                        'text-gray-600 hover:text-gray-900 transition block',
                      ),
                    ],
                    [text],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    ],
  )

const view = (model: Model) => {
  const content = M.value(model.route).pipe(
    M.tagsExhaustive({
      Home: homeView,
      GettingStarted: () => gettingStartedView(model),
      Architecture: () => architectureView(model),
      Examples: examplesView,
      BestPractices: bestPracticesView,
      NotFound: ({ path }) => notFoundView(path),
    }),
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
        [Class('flex flex-1 bg-gray-50 relative overflow-hidden')],
        [
          sidebarView(model.route, model.mobileMenuOpen),
          main(
            [Class('flex-1 min-w-0 overflow-y-auto')],
            [
              div(
                [Class('p-4 md:p-8 max-w-4xl mx-auto min-w-0')],
                [content],
              ),
            ],
          ),
          S.is(ArchitectureRoute)(model.route)
            ? tableOfContentsView(architectureTableOfContents)
            : empty,
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
