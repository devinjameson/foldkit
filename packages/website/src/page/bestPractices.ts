import { Html } from 'foldkit/html'

import { Class, div, li, strong, ul } from '../html'
import { Link } from '../link'
import type { TableOfContentsEntry } from '../main'
import { heading, inlineCode, link, para, section } from '../prose'

type Header = { id: string; text: string }

const pureFunctionsHeader: Header = {
  id: 'pureFunctions',
  text: 'Pure Functions Everywhere',
}

const messagesAsIntentsHeader: Header = {
  id: 'messagesAsIntents',
  text: 'Messages as Intents',
}

const scalingWithSubmodelsHeader: Header = {
  id: 'scalingWithSubmodels',
  text: 'Scaling with Submodels',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  { level: 'h2', ...pureFunctionsHeader },
  { level: 'h2', ...messagesAsIntentsHeader },
  { level: 'h2', ...scalingWithSubmodelsHeader },
]

export const view = (): Html =>
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
        para(strong([], ['View is pure:'])),
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
        para(strong([], ['Update is pure:'])),
        ul(
          [Class('list-disc mb-6 space-y-2 ml-4')],
          [
            li(
              [],
              [
                "Returns a new Model and a list of Commands — doesn't execute anything",
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
        para(
          'Side effects happen in ',
          strong([], ['Commands']),
          '. A Command is an Effect that performs a side effect — fetch this URL, wait 500ms, read from storage — and returns a Message that gets pushed back into ',
          inlineCode('update'),
          '.',
        ),
        para(
          'Unlike React where side effects can trigger during render (',
          inlineCode('useEffect'),
          '), Foldkit side effects only happen in response to Messages.',
        ),
        para(
          'This separation makes your code predictable and testable. You can test ',
          inlineCode('update'),
          ' by checking that it returns the right Model and Commands — without mocking HTTP or timers.',
        ),
      ]),
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
          para(strong([], ['Good:'])),
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
          para(strong([], ['Avoid:'])),
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
      section(
        scalingWithSubmodelsHeader.id,
        scalingWithSubmodelsHeader.text,
        [
          para(
            'As your app grows, a single Model/Message/Update becomes unwieldy. The submodel pattern lets you split your app into self-contained modules.',
          ),
          para(strong([], ['Each submodule has:'])),
          ul(
            [Class('list-disc mb-4 space-y-1 ml-4')],
            [
              li(
                [],
                ['Its own Model, Message, init, update, and view'],
              ),
              li(
                [],
                [
                  'A view that takes a ',
                  inlineCode('toMessage'),
                  ' function to wrap its messages',
                ],
              ),
            ],
          ),
          para(strong([], ['The parent:'])),
          ul(
            [Class('list-disc mb-4 space-y-1 ml-4')],
            [
              li(
                [],
                [
                  'Embeds the child Model: ',
                  inlineCode('productsPage: Products.Model'),
                ],
              ),
              li(
                [],
                [
                  'Has a wrapper Message: ',
                  inlineCode(
                    'ProductsMessage({ message: Products.Message })',
                  ),
                ],
              ),
              li(
                [],
                [
                  'Delegates in update, then rewraps returned Commands',
                ],
              ),
              li([], ['Passes a wrapper function to the child view']),
            ],
          ),
          para(
            'See the ',
            link(Link.exampleShoppingCart, 'Shopping Cart example'),
            ' for a complete implementation of this pattern.',
          ),
        ],
      ),
    ],
  )
