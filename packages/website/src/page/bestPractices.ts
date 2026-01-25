import { Html } from 'foldkit/html'

import { Class, InnerHTML, div, li, strong, ul } from '../html'
import { Link } from '../link'
import type { Model, TableOfContentsEntry } from '../main'
import { heading, inlineCode, link, para, section } from '../prose'
import * as Snippets from '../snippet'
import { highlightedCodeBlock } from '../view/codeBlock'

type Header = { id: string; text: string }

const pureFunctionsHeader: Header = {
  id: 'pureFunctions',
  text: 'Pure Functions Everywhere',
}

const requestingValuesHeader: Header = {
  id: 'requestingValues',
  text: 'Requesting Values',
}

const immutableUpdatesHeader: Header = {
  id: 'immutableUpdates',
  text: 'Immutable Updates with evo',
}

const messagesAsIntentsHeader: Header = {
  id: 'messagesAsIntents',
  text: 'Messages as Intents',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  { level: 'h2', ...pureFunctionsHeader },
  { level: 'h2', ...requestingValuesHeader },
  { level: 'h2', ...immutableUpdatesHeader },
  { level: 'h2', ...messagesAsIntentsHeader },
]

export const view = (model: Model): Html =>
  div(
    [],
    [
      heading(1, 'bestPractices', 'Best Practices'),
      para(
        'Foldkit requires a different way of thinking than most TypeScript frameworks. These patterns will help you write maintainable applications.',
      ),
      section(pureFunctionsHeader.id, pureFunctionsHeader.text, [
        para(
          'In Foldkit, both ',
          inlineCode('view'),
          ' and ',
          inlineCode('update'),
          ' are pure functions. They take inputs and return outputs without side effects.',
        ),
        heading(3, 'viewIsPure', 'View is Pure'),
        ul(
          [Class('list-disc mb-6 space-y-2 ml-4')],
          [
            li([], ['No hooks, no lifecycle methods']),
            li([], ['No fetching data, no timers, no subscriptions']),
            li(
              [],
              ['Given the same Model, always returns the same Html'],
            ),
          ],
        ),
        highlightedCodeBlock(
          div(
            [
              Class('text-sm'),
              InnerHTML(Snippets.viewPureBadHighlighted),
            ],
            [],
          ),
          Snippets.viewPureBadRaw,
          'Copy bad view example to clipboard',
          model,
          'mb-4',
        ),
        highlightedCodeBlock(
          div(
            [
              Class('text-sm'),
              InnerHTML(Snippets.viewPureGoodHighlighted),
            ],
            [],
          ),
          Snippets.viewPureGoodRaw,
          'Copy good view example to clipboard',
          model,
          'mb-8',
        ),
        heading(3, 'updateIsPure', 'Update is Pure'),
        ul(
          [Class('list-disc mb-6 space-y-2 ml-4')],
          [
            li(
              [],
              [
                "Returns a new Model and a list of Commands — doesn't execute anything. Foldkit runs the provided commands.",
              ],
            ),
            li([], ['No mutations, no side effects']),
            li(
              [],
              [
                'Given the same Model and Message, always returns the same result',
              ],
            ),
          ],
        ),
        highlightedCodeBlock(
          div(
            [
              Class('text-sm'),
              InnerHTML(Snippets.updatePureBadHighlighted),
            ],
            [],
          ),
          Snippets.updatePureBadRaw,
          'Copy bad update example to clipboard',
          model,
          'mb-4',
        ),
        highlightedCodeBlock(
          div(
            [
              Class('text-sm'),
              InnerHTML(Snippets.updatePureGoodHighlighted),
            ],
            [],
          ),
          Snippets.updatePureGoodRaw,
          'Copy good update example to clipboard',
          model,
          'mb-8',
        ),
        para(
          'Side effects happen in ',
          strong([], ['Commands']),
          '. A Command is an Effect that describes a side effect — fetch this URL, wait 500ms, read from storage. Your ',
          inlineCode('update'),
          " function doesn't execute anything; it just returns data describing what should happen. Foldkit's runtime takes those Commands, executes them, and feeds the results back as Messages.",
        ),
        para(
          "This means side effects still happen — you're not avoiding them. But they happen in a contained environment managed by the runtime, not scattered throughout your code. Your business logic stays pure: given the same inputs, it always returns the same outputs. The impurity is pushed to the edges.",
        ),
        para(
          'Unlike React where side effects can trigger during render (',
          inlineCode('useEffect'),
          '), Foldkit side effects only happen in response to Messages. This separation makes your code predictable and testable.',
        ),
        heading(3, 'testingUpdate', 'Testing Update Functions'),
        para(
          "Foldkit's pure update model makes testing painless because state transitions are just function calls — pass in a Model and Message, assert on the returned Model. And because Commands are Effects with explicit dependencies, you can swap in mocks without reaching for libraries like ",
          link(Link.msw, 'msw'),
          ' or stubbing globals:',
        ),
        highlightedCodeBlock(
          div(
            [
              Class('text-sm'),
              InnerHTML(Snippets.testingUpdateHighlighted),
            ],
            [],
          ),
          Snippets.testingUpdateRaw,
          'Copy testing example to clipboard',
          model,
          'mb-8',
        ),
        para(
          'See the ',
          link(Link.exampleWeatherTests, 'Weather example tests'),
          ' for a complete implementation.',
        ),
      ]),
      section(
        requestingValuesHeader.id,
        requestingValuesHeader.text,
        [
          para(
            'A common mistake is computing random or time-based values directly in ',
            inlineCode('update'),
            '. This breaks purity — calling the function twice with the same inputs would return different results.',
          ),
          heading(3, 'dontComputeDirectly', "Don't Compute Directly"),
          highlightedCodeBlock(
            div(
              [
                Class('text-sm'),
                InnerHTML(Snippets.pureUpdateBadHighlighted),
              ],
              [],
            ),
            Snippets.pureUpdateBadRaw,
            'Copy bad example to clipboard',
            model,
            'mb-8',
          ),
          heading(3, 'requestViaCommand', 'Request Via Command'),
          para(
            'Instead, return a Command that generates the value and sends it back as a Message:',
          ),
          highlightedCodeBlock(
            div(
              [
                Class('text-sm'),
                InnerHTML(Snippets.pureUpdateGoodHighlighted),
              ],
              [],
            ),
            Snippets.pureUpdateGoodRaw,
            'Copy good example to clipboard',
            model,
            'mb-8',
          ),
          para(
            'This "request/response" pattern keeps ',
            inlineCode('update'),
            ' pure. The ',
            inlineCode('SpawnApple'),
            ' handler always returns the same result — it just emits a Command. The actual random generation happens in the Effect, and the result comes back via ',
            inlineCode('GotApplePosition'),
            '.',
          ),
          para(
            'See the ',
            link(Link.exampleSnakeRequestPattern, 'Snake example'),
            ' for a complete implementation of this pattern.',
          ),
        ],
      ),
      section(
        immutableUpdatesHeader.id,
        immutableUpdatesHeader.text,
        [
          para(
            'Foldkit provides ',
            inlineCode('evo'),
            " for immutable model updates. It wraps Effect's ",
            inlineCode('Struct.evolve'),
            " with stricter type checking — if you remove or rename a key from your Model, you'll get type errors everywhere you try to update it.",
          ),
          highlightedCodeBlock(
            div(
              [
                Class('text-sm'),
                InnerHTML(Snippets.evoExampleHighlighted),
              ],
              [],
            ),
            Snippets.evoExampleRaw,
            'Copy evo example to clipboard',
            model,
            'mb-8',
          ),
          para(
            'Each property in the transform object is a function that takes the current value and returns the new value. Properties not included remain unchanged.',
          ),
        ],
      ),
      section(
        messagesAsIntentsHeader.id,
        messagesAsIntentsHeader.text,
        [
          para(
            'Messages describe ',
            strong([], ['what happened']),
            ', not ',
            strong([], ['what to do']),
            '. Name them after user actions or events, not implementation details.',
          ),
          heading(3, 'goodMessageNames', 'Good Message Names'),
          ul(
            [
              Class(
                'list-disc mb-4 space-y-1 ml-4 font-mono text-sm',
              ),
            ],
            [
              li([], ['AddToCartClicked']),
              li([], ['SearchInputChanged']),
              li([], ['UserDataReceived']),
            ],
          ),
          heading(3, 'avoidThese', 'Avoid These'),
          ul(
            [
              Class(
                'list-disc mb-6 space-y-1 ml-4 font-mono text-sm',
              ),
            ],
            [
              li([], ['SetCartItems']),
              li([], ['UpdateSearchText']),
              li([], ['MutateUserState']),
            ],
          ),
          para(
            'The ',
            inlineCode('update'),
            ' function decides how to handle a Message. The Message itself is just a fact about what occurred.',
          ),
        ],
      ),
    ],
  )
