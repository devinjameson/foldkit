import { Html } from 'foldkit/html'

import { Class, InnerHTML, div, em, strong } from '../html'
import { Link } from '../link'
import type { Model, TableOfContentsEntry } from '../main'
import { heading, inlineCode, link, para, section } from '../prose'
import * as Snippets from '../snippet'
import { highlightedCodeBlock } from '../view/codeBlock'

type Header = { id: string; text: string }

const counterExampleHeader: Header = {
  id: 'counterExample',
  text: 'A Simple Counter Example',
}
const modelHeader: Header = { id: 'model', text: 'Model' }
const messagesHeader: Header = { id: 'messages', text: 'Messages' }
const updateHeader: Header = { id: 'update', text: 'Update' }
const viewHeader: Header = { id: 'view', text: 'View' }
const commandsHeader: Header = { id: 'commands', text: 'Commands' }
const commandStreamsHeader: Header = {
  id: 'commandStreams',
  text: 'Command Streams',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  { level: 'h2', ...counterExampleHeader },
  { level: 'h2', ...modelHeader },
  { level: 'h2', ...messagesHeader },
  { level: 'h2', ...updateHeader },
  { level: 'h2', ...viewHeader },
  { level: 'h2', ...commandsHeader },
  { level: 'h2', ...commandStreamsHeader },
]

export const view = (model: Model): Html =>
  div(
    [],
    [
      heading(
        1,
        'architectureAndConcepts',
        'Architecture & Concepts',
      ),
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
      highlightedCodeBlock(
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
        highlightedCodeBlock(
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
        highlightedCodeBlock(
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
        highlightedCodeBlock(
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
          inlineCode('OnClick'),
          '.',
        ),
        highlightedCodeBlock(
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
        highlightedCodeBlock(
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
        highlightedCodeBlock(
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
          inlineCode('fetchCount'),
          " to understand what's happening here:",
        ),
        highlightedCodeBlock(
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
      section(commandStreamsHeader.id, commandStreamsHeader.text, [
        para(
          'Commands are great for one-off side effects, but what about ongoing streams of events? Think timers, WebSocket connections, or keyboard input. For these, Foldkit provides ',
          strong([], ['Command Streams']),
          '.',
        ),
        para(
          'A Command Stream is a stream of Commands that runs continuously based on some part of your model that the stream depends on. When that part of the model changes, the stream is automatically restarted with the new values.',
        ),
        para(
          "Let's look at a stopwatch example. We want a timer that ticks every 100ms, but only when ",
          inlineCode('isRunning'),
          ' is ',
          inlineCode('true'),
          '. This gives us a way to start and stop the stopwatch based on user input.',
        ),
        highlightedCodeBlock(
          div(
            [
              Class('text-sm'),
              InnerHTML(Snippets.stopwatchCommandStreamHighlighted),
            ],
            [],
          ),
          Snippets.stopwatchCommandStreamRaw,
          'Copy command stream example to clipboard',
          model,
        ),
        para(
          'The key concept is ',
          inlineCode('CommandStreamsDeps'),
          '. This schema defines what parts of the model your streams depend on. Each stream has two functions:',
        ),
        para(
          inlineCode('modelToDeps'),
          ' extracts the relevant dependencies from the model.',
        ),
        para(
          inlineCode('depsToStream'),
          ' creates a stream based on those dependencies.',
        ),
        para(
          'When ',
          inlineCode('isRunning'),
          ' changes from ',
          inlineCode('false'),
          ' to ',
          inlineCode('true'),
          ', the stream starts ticking. When it changes back to ',
          inlineCode('false'),
          ', the stream stops. Foldkit handles all the lifecycle management for you.',
        ),
        para(
          'For a more complex example using WebSocket connections, see the ',
          link(Link.websocketChatExample, 'websocket-chat example'),
          '. For a full real-world application, check out ',
          link(Link.typingTerminal, 'Typing Terminal'),
          ' (',
          link(Link.typingTerminalSource, 'source'),
          ').',
        ),
      ]),
    ],
  )
