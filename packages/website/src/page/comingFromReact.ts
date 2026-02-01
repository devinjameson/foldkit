import { Html } from 'foldkit/html'

import { Class, InnerHTML, div, li, strong, ul } from '../html'
import { Link } from '../link'
import type { Model, TableOfContentsEntry } from '../main'
import {
  callout,
  heading,
  inlineCode,
  link,
  para,
  tableOfContentsEntryToHeader,
} from '../prose'
import * as Snippets from '../snippet'
import { highlightedCodeBlock } from '../view/codeBlock'
import { comparisonTable } from '../view/table'

const introductionHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'introduction',
  text: 'Introduction',
}

const mentalModelShiftsHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'mental-model-shifts',
  text: 'Mental Model Shifts',
}

const codeComparisonHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'code-comparison',
  text: 'Side-by-Side Code Comparison',
}

const patternMappingHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'pattern-mapping',
  text: 'Pattern Mapping',
}

const whatYoullMissHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'what-youll-miss',
  text: "What You'll Miss",
}

const whatYoullGainHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'what-youll-gain',
  text: "What You'll Gain",
}

const faqHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'faq',
  text: 'FAQ',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  introductionHeader,
  mentalModelShiftsHeader,
  codeComparisonHeader,
  patternMappingHeader,
  whatYoullMissHeader,
  whatYoullGainHeader,
  faqHeader,
]

const patternMappingTable = (): Html =>
  comparisonTable(
    ['React Ecosystem', 'Foldkit'],
    [
      [[inlineCode('useState')], ['Model (single state tree)']],
      [
        [inlineCode('useReducer')],
        [inlineCode('update'), ' function'],
      ],
      [
        [inlineCode('useEffect')],
        ['Commands (returned from ', inlineCode('update'), ')'],
      ],
      [
        [inlineCode('useContext'), ' / Redux / Zustand'],
        ['Single Model (no prop drilling)'],
      ],
      [
        [inlineCode('useMemo'), ' / ', inlineCode('useCallback')],
        ['Not needed (no stale closures)'],
      ],
      [['Custom hooks'], ['Domain modules with pure functions']],
      [['JSX'], ['Typed HTML helper functions']],
      [['Component props'], ['Function parameters']],
      [['Component state'], ['Part of the single Model']],
      [
        ['Event handlers'],
        ['Messages dispatched to ', inlineCode('update')],
      ],
      [
        ['React Router / TanStack Router'],
        ['Built-in typed routing'],
      ],
      [
        ['React Hook Form / Formik'],
        ['Model + Messages + Effect Schema validation'],
      ],
      [
        ['TanStack Query / SWR'],
        ['Commands + Command Streams + typed async ADTs'],
      ],
      [['WebSocket libraries / real-time'], ['Command Streams']],
      [
        ['Error boundaries'],
        ['Typed errors in Effects + ', inlineCode('errorView')],
      ],
    ],
  )

export const view = (model: Model): Html =>
  div(
    [],
    [
      heading('h1', 'coming-from-react', 'Coming from React'),
      tableOfContentsEntryToHeader(introductionHeader),
      para(
        "If you're coming from React, you already understand component-based UI, state management, and the challenges of building complex web applications. Foldkit takes a different approach — one that may feel unfamiliar at first but addresses many frustrations you've likely encountered.",
      ),
      para(
        "This guide won't try to convince you that React is bad. React is a great tool that has shaped modern frontend development. But if you've ever struggled with stale closures, effect dependency arrays, or state scattered across components, Foldkit offers an alternative worth exploring.",
      ),
      tableOfContentsEntryToHeader(mentalModelShiftsHeader),
      para('The biggest shifts when moving from React to Foldkit:'),
      ul(
        [Class('list-disc mb-6 space-y-3 ml-4')],
        [
          li(
            [],
            [
              strong([], ['Components → Functions']),
              ' — Instead of components with their own state and lifecycle, you have pure functions. The view is just a function from Model to HTML.',
            ],
          ),
          li(
            [],
            [
              strong([], ['Local State → Single Model']),
              " — There's no useState scattered across components. All application state lives in one place, making it trivial to understand what your app knows at any moment.",
            ],
          ),
          li(
            [],
            [
              strong([], ['useEffect → Commands']),
              ' — Side effects are explicit return values from update, not callbacks triggered by dependency arrays. You never wonder "why did this effect run?"',
            ],
          ),
          li(
            [],
            [
              strong([], ['Hooks Rules → No Rules']),
              ' — No worrying about calling hooks in the wrong order, in conditionals, or in loops. There are no hooks — just functions.',
            ],
          ),
          li(
            [],
            [
              strong([], ['Props Drilling → Direct Access']),
              " — With a single Model, any part of your view can access any state. You don't need Context or state management libraries to avoid prop drilling.",
            ],
          ),
        ],
      ),
      callout(
        'If you know Redux...',
        'The Model-View-Update pattern will feel familiar. Think of the Model as your Redux store, Messages as actions, and update as your reducer — but without the boilerplate of action creators, selectors, and middleware.',
      ),
      tableOfContentsEntryToHeader(codeComparisonHeader),
      para(
        "Let's compare a counter in React and Foldkit. The React version uses hooks:",
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.reactCounterHighlighted),
          ],
          [],
        ),
        Snippets.reactCounterRaw,
        'Copy React counter',
        model,
        'mb-4',
      ),
      para('The Foldkit version separates state, events, and view:'),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.foldkitCounterHighlighted),
          ],
          [],
        ),
        Snippets.foldkitCounterRaw,
        'Copy Foldkit counter',
        model,
        'mb-6',
      ),
      para(
        'At small scale, Foldkit is more lines of code. The advantages become clear when you add complexity — async operations, multiple pieces of state, or effects that depend on state.',
      ),
      para(
        "Here's a data fetching example. React requires careful handling of loading states, race conditions, and cleanup:",
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.reactDataFetchingHighlighted),
          ],
          [],
        ),
        Snippets.reactDataFetchingRaw,
        'Copy React data fetching',
        model,
        'mb-4',
      ),
      para(
        'In Foldkit, the same pattern is explicit and predictable:',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.foldkitDataFetchingHighlighted),
          ],
          [],
        ),
        Snippets.foldkitDataFetchingRaw,
        'Copy Foldkit data fetching',
        model,
        'mb-6',
      ),
      para(
        "Notice there's no cleanup function, no cancelled flag, no stale closure risk. When the user clicks a button, you dispatch FetchUserClicked. The Command runs, and when it completes, it dispatches the result message. The architecture eliminates the need for defensive coding.",
      ),
      tableOfContentsEntryToHeader(patternMappingHeader),
      para("Here's how common React patterns map to Foldkit:"),
      patternMappingTable(),
      tableOfContentsEntryToHeader(whatYoullMissHeader),
      para(
        "Let's be honest about the tradeoffs. Coming from React, you may miss:",
      ),
      ul(
        [Class('list-disc mb-6 space-y-2 ml-4')],
        [
          li(
            [],
            [
              strong([], ['Component encapsulation']),
              ' — In React, components encapsulate state and behavior. In Foldkit, state is centralized. This is a feature, not a bug, but it requires a different way of thinking about code organization.',
            ],
          ),
          li(
            [],
            [
              strong([], ['The React ecosystem']),
              " — React has thousands of component libraries, UI kits, and integrations. Foldkit is much smaller. You'll often write more from scratch.",
            ],
          ),
          li(
            [],
            [
              strong([], ['JSX']),
              " — Many developers prefer JSX's HTML-like syntax. Foldkit uses function calls that some find more verbose. Others prefer the consistency — it's just functions all the way down.",
            ],
          ),
          li(
            [],
            [
              strong([], ['Gradual adoption']),
              " — You can add React to any page incrementally. Foldkit works best as a full-page application. It's harder to embed a Foldkit widget in an existing React app.",
            ],
          ),
          li(
            [],
            [
              strong([], ['Familiarity']),
              " — Most frontend developers know React. Foldkit's patterns, while not difficult, require learning. Team onboarding takes longer.",
            ],
          ),
        ],
      ),
      tableOfContentsEntryToHeader(whatYoullGainHeader),
      para("In return, you'll gain:"),
      ul(
        [Class('list-disc mb-6 space-y-2 ml-4')],
        [
          li(
            [],
            [
              strong([], ['No stale closures']),
              " — Ever. The update function always receives the current model. There's no dependency array to get wrong.",
            ],
          ),
          li(
            [],
            [
              strong([], ['Explicit effects']),
              ' — Every side effect is a return value from update. You can see exactly what effects a message triggers by reading the code.',
            ],
          ),
          li(
            [],
            [
              strong([], ['Testable by default']),
              ' — Your update function is pure. Give it a model and message, check the output. No mocking useState or useEffect.',
            ],
          ),
          li(
            [],
            [
              strong([], ['Type-safe everything']),
              ' — Model, Messages, Commands — all typed. Effect Schema validates at runtime too. Fewer "undefined is not a function" errors.',
            ],
          ),
          li(
            [],
            [
              strong([], ['No hook rules']),
              ' — Call any function anywhere. No "rules of hooks" to remember, no linter errors about missing dependencies.',
            ],
          ),
          li(
            [],
            [
              strong([], ['Single source of truth']),
              " — Want to know your app's state? It's all in the Model. Want to know what can happen? Look at Messages. Want to know how state changes? Read update.",
            ],
          ),
        ],
      ),
      tableOfContentsEntryToHeader(faqHeader),
      para(strong([], ['How do I make reusable "components"?'])),
      para(
        "Create functions that take parts of your Model and return Html. They're not components in the React sense — they don't have their own state — but they're reusable view logic. For complex features, you can use the submodel pattern to organize related state and logic together.",
      ),
      para(
        strong(
          [],
          [
            'How do I create multiple components with their own state?',
          ],
        ),
      ),
      para(
        'There are no components in Foldkit. State always lives in your Model, and views are just functions from Model to Html. Say you need multiple accordions with independent state — you model that explicitly:',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.multipleInstancesHighlighted),
          ],
          [],
        ),
        Snippets.multipleInstancesRaw,
        'Copy Model example',
        model,
        'mb-4',
      ),
      para(
        'Here ',
        inlineCode('Accordion.Model'),
        ' is a submodel — a self-contained piece of state defined in its own module, with its own Message types, update function, and view. This is similar to what experienced React devs often end up doing anyway — lifting state out of components into a parent. Foldkit just enforces this pattern from the start. See the ',
        link(Link.exampleShoppingCart, 'Shopping Cart example'),
        ' for the full submodel pattern.',
      ),
      para(strong([], ['How does routing work?'])),
      para(
        'Foldkit has built-in typed routing. See the ',
        link('/routing-and-navigation', 'Routing & Navigation'),
        ' page for details.',
      ),
      para(strong([], ['What about forms?'])),
      para(
        'Forms work like everything else: form state lives in your Model, input dispatches Messages, and update handles validation. Check the ',
        link(Link.exampleForm, 'form example'),
        ' for patterns.',
      ),
      para(strong([], ["I'm sold. Where do I start?"])),
      para(
        'Head to ',
        link('/getting-started', 'Getting Started'),
        ' to create your first Foldkit app. Then read ',
        link('/architecture-and-concepts', 'Architecture & Concepts'),
        ' to understand the pieces in depth.',
      ),
    ],
  )
