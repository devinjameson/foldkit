import { Match as M, Schema } from 'effect'
import { Runtime } from 'foldkit'
import { Class, Html, OnClick, button, div } from 'foldkit/html'
import { ts } from 'foldkit/schema'

// MODEL - The shape of your application state
// In this case, our state is just a number representing the count

const Model = Schema.Number
type Model = typeof Model.Type

// MESSAGE - All possible events that can happen in your application
// Messages are dispatched from the view and handled by the update function

const Decrement = ts('Decrement')
const Increment = ts('Increment')
const Reset = ts('Reset')

const Message = Schema.Union(Decrement, Increment, Reset)

type Decrement = typeof Decrement.Type
type Increment = typeof Increment.Type
type Reset = typeof Reset.Type

type Message = typeof Message.Type

// UPDATE - How your state changes in response to messages
// Returns a tuple of [nextModel, commands]
// Commands are side effects like HTTP requests (none needed here)

const update = (
  count: Model,
  message: Message,
): [Model, ReadonlyArray<Runtime.Command<Message>>] =>
  M.value(message).pipe(
    M.withReturnType<
      [Model, ReadonlyArray<Runtime.Command<Message>>]
    >(),
    M.tagsExhaustive({
      Decrement: () => [count - 1, []],
      Increment: () => [count + 1, []],
      Reset: () => [0, []],
    }),
  )

// INIT - The initial model and any commands to run on startup
// Returns a tuple of [initialModel, initialCommands]

const init: Runtime.ElementInit<Model, Message> = () => [0, []]

// VIEW - Renders your state as HTML
// Pure function: same state always produces the same HTML - no side effects in
// the view

const view = (count: Model): Html =>
  div(
    [Class(containerStyle)],
    [
      div(
        [Class('text-6xl font-bold text-gray-800')],
        [count.toString()],
      ),
      div(
        [Class('flex flex-wrap justify-center gap-4')],
        [
          button(
            [OnClick(Decrement.make()), Class(buttonStyle)],
            ['-'],
          ),
          button(
            [OnClick(Reset.make()), Class(buttonStyle)],
            ['Reset'],
          ),
          button(
            [OnClick(Increment.make()), Class(buttonStyle)],
            ['+'],
          ),
        ],
      ),
    ],
  )

// STYLE

const containerStyle =
  'min-h-screen bg-white flex flex-col items-center justify-center gap-6 p-6'

const buttonStyle =
  'bg-black text-white hover:bg-gray-700 px-4 py-2 transition'

// RUN - Wire everything together and start the application

const element = Runtime.makeElement({
  Model,
  init,
  update,
  view,
  container: document.getElementById('root')!,
})

Runtime.run(element)
