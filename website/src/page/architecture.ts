import {
  Class,
  Html,
  InnerHTML,
  code,
  div,
  em,
  strong,
} from 'foldkit/html'

import { Link } from '../link'
import type { Model, TableOfContentsEntry } from '../main'
import { heading, link, para, section } from '../prose'
import * as Snippets from '../snippet'
import { codeBlock } from '../view/codeBlock'

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

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  { level: 'h2', ...counterExampleHeader },
  { level: 'h2', ...modelHeader },
  { level: 'h2', ...messagesHeader },
  { level: 'h2', ...updateHeader },
  { level: 'h2', ...viewHeader },
  { level: 'h2', ...commandsHeader },
]

export const view = (model: Model): Html =>
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
      codeBlock(
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
        codeBlock(
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
        codeBlock(
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
        codeBlock(
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
        codeBlock(
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
        codeBlock(
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
        codeBlock(
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
        codeBlock(
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
