import { Html } from 'foldkit/html'

import {
  Class,
  div,
  li,
  strong,
  table,
  tbody,
  td,
  th,
  thead,
  tr,
  ul,
} from '../html'
import { Link } from '../link'
import type { TableOfContentsEntry } from '../main'
import {
  bullets,
  heading,
  inlineCode,
  link,
  para,
  tableOfContentsEntryToHeader,
} from '../prose'

const theProblemHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'the-problem',
  text: 'The Problem',
}

const foldkitVsReactHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'foldkit-vs-react',
  text: 'Foldkit vs React',
}

const theElmArchitectureHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'the-elm-architecture',
  text: 'The Elm Architecture',
}

const builtOnEffectHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'built-on-effect',
  text: 'Built on Effect',
}

const whoItsForHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'who-its-for',
  text: "Who It's For",
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  theProblemHeader,
  foldkitVsReactHeader,
  theElmArchitectureHeader,
  builtOnEffectHeader,
  whoItsForHeader,
]

const comparisonTable = (): Html => {
  const headerCell = (text: string) =>
    th(
      [
        Class(
          'px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white',
        ),
      ],
      [text],
    )

  const featureCell = (text: string) =>
    td(
      [
        Class(
          'px-4 py-3 text-sm font-medium text-gray-900 dark:text-white',
        ),
      ],
      [text],
    )

  const descriptionCell = (text: string) =>
    td(
      [Class('px-4 py-3 text-sm text-gray-700 dark:text-gray-300')],
      [text],
    )

  const comparisonRow = (
    feature: string,
    react: string,
    foldkit: string,
  ) =>
    tr(
      [Class('border-b border-gray-200 dark:border-gray-700')],
      [
        featureCell(feature),
        descriptionCell(react),
        descriptionCell(foldkit),
      ],
    )

  return div(
    [Class('overflow-x-auto mb-6')],
    [
      table(
        [
          Class(
            'w-full border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden',
          ),
        ],
        [
          thead(
            [Class('bg-gray-100 dark:bg-gray-800')],
            [
              tr(
                [],
                [
                  headerCell('Feature'),
                  headerCell('React'),
                  headerCell('Foldkit'),
                ],
              ),
            ],
          ),
          tbody(
            [],
            [
              comparisonRow(
                'Routing',
                'React Router + state sync + URL parsing',
                'Built-in typed routes, automatic URL ↔ Model sync',
              ),
              comparisonRow(
                'Complex state',
                'useState/useReducer/Context/Redux/Zustand + prop drilling',
                'Single Model, exhaustive message handling',
              ),
              comparisonRow(
                'Side effects',
                'useEffect cleanup, race conditions, stale closures',
                'Commands are explicit, return values from update',
              ),
              comparisonRow(
                'Subscriptions',
                'Manual useEffect + cleanup + dependency arrays',
                'CommandStreams with automatic lifecycle',
              ),
              comparisonRow(
                'Debugging',
                'React DevTools + Redux DevTools + console.log',
                'Single state tree, message log, time-travel (in development)',
              ),
            ],
          ),
        ],
      ),
    ],
  )
}

export const view = (): Html =>
  div(
    [],
    [
      heading('h1', 'whyFoldkit', 'Why Foldkit?'),
      tableOfContentsEntryToHeader(theProblemHeader),
      para(
        'Modern web frameworks make simple things complex. What starts as a clean component quickly accumulates state management patterns, effect handling, and implicit dependencies.',
      ),
      bullets(
        'State scattered across components, hooks, contexts, and stores',
        'Side effects mixed with rendering logic',
        'Debugging requires understanding implicit dependencies',
        'Race conditions and stale closures lurk in async code',
        'Testing requires mocking framework internals',
      ),
      para(
        'These problems compound as applications grow. Teams spend more time managing complexity than building features.',
      ),
      tableOfContentsEntryToHeader(foldkitVsReactHeader),
      para(
        'A simple counter looks similar in both React and Foldkit. The difference emerges as complexity grows.',
      ),
      comparisonTable(),
      para(
        strong([], ['Key insight:']),
        " React's simplicity at small scale becomes complexity debt. Foldkit's structure feels like overhead at first but pays off as the app grows.",
      ),
      tableOfContentsEntryToHeader(theElmArchitectureHeader),
      para(
        'Foldkit implements ',
        link(Link.elmArchitecture, 'The Elm Architecture'),
        ', a proven pattern for building reliable user interfaces.',
      ),
      ul(
        [Class('list-disc mb-6 space-y-2 ml-4')],
        [
          li(
            [],
            [
              strong([], ['Single source of truth']),
              ' — All application state lives in one Model',
            ],
          ),
          li(
            [],
            [
              strong([], ['Explicit state transitions']),
              ' — Messages describe what happened, Update decides what changes',
            ],
          ),
          li(
            [],
            [
              strong([], ['Pure functions everywhere']),
              ' — Update returns new state + Commands, runtime executes effects',
            ],
          ),
          li(
            [],
            [
              strong([], ['Predictable debugging']),
              ' — If you know the Model and Message, you know what happens next',
            ],
          ),
        ],
      ),
      para(
        'This architecture has been refined over a decade in the ',
        link(Link.elm, 'Elm'),
        ' community. Foldkit brings these ideas to TypeScript.',
      ),
      tableOfContentsEntryToHeader(builtOnEffectHeader),
      para(
        'Foldkit is built on ',
        link(Link.effect, 'Effect'),
        ', a powerful library for type-safe, composable programming in TypeScript.',
      ),
      ul(
        [Class('list-disc mb-6 space-y-2 ml-4')],
        [
          li(
            [],
            [
              strong([], ['Type-safe error handling']),
              ' — Errors are tracked in the type system',
            ],
          ),
          li(
            [],
            [
              strong([], ['Composable side effects']),
              ' — Build complex operations from simple pieces',
            ],
          ),
          li(
            [],
            [
              strong([], ['Schema validation']),
              ' — Runtime type checking with ',
              inlineCode('Schema'),
            ],
          ),
          li(
            [],
            [
              strong([], ['Command Streams']),
              ' — For timers, WebSockets, and other ongoing effects',
            ],
          ),
        ],
      ),
      para(
        'If you already know Effect, Foldkit feels natural. If you are new to Effect, Foldkit is a great way to learn it.',
      ),
      tableOfContentsEntryToHeader(whoItsForHeader),
      ul(
        [Class('list-disc mb-6 space-y-2 ml-4')],
        [
          li(
            [],
            [
              strong([], ['Elm developers']),
              ' who need access to the TypeScript ecosystem',
            ],
          ),
          li(
            [],
            [
              strong([], ['Effect users']),
              ' who want a UI framework built on familiar patterns',
            ],
          ),
          li(
            [],
            [
              strong([], ['React developers']),
              ' tired of state management complexity',
            ],
          ),
          li(
            [],
            [
              strong([], ['Teams']),
              ' who value predictability and testability over flexibility',
            ],
          ),
        ],
      ),
      para(
        'Foldkit is not for everyone. If you enjoy the flexibility of the React ecosystem or prefer choosing your own patterns, other frameworks may be a better fit. But if you have ever wished for a more principled approach to frontend development, give Foldkit a try.',
      ),
    ],
  )
