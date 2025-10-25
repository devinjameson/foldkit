import { Match as M, Schema as S } from 'effect'
import { Runtime } from 'foldkit'
import { Class, Html, OnClick, button, div, h1 } from 'foldkit/html'
import { ts } from 'foldkit/schema'

const Model = S.Struct({
  message: S.String,
})
type Model = typeof Model.Type

const Increment = ts('Increment')
type Increment = typeof Increment.Type

const Message = S.Union(Increment)
type Message = typeof Message.Type

const update = (model: Model, message: Message): [Model, ReadonlyArray<Runtime.Command<Message>>] =>
  M.value(message).pipe(
    M.withReturnType<[Model, ReadonlyArray<Runtime.Command<Message>>]>(),
    M.tagsExhaustive({
      Increment: () => [{ ...model, message: 'Button clicked!' }, []],
    }),
  )

const init: Runtime.ElementInit<Model, Message> = () => [
  {
    message: 'Welcome to Typing Speed Game!',
  },
  [],
]

const view = (model: Model): Html =>
  div(
    [Class('min-h-screen bg-gray-100 flex items-center justify-center')],
    [
      div(
        [Class('bg-white rounded-lg shadow-lg p-8')],
        [
          h1([Class('text-3xl font-bold text-gray-800 mb-4')], [model.message]),
          button(
            [
              OnClick(Increment.make()),
              Class('bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded'),
            ],
            ['Click me!'],
          ),
        ],
      ),
    ],
  )

const element = Runtime.makeElement({
  Model,
  init,
  update,
  view,
  container: document.getElementById('root')!,
})

Runtime.run(element)
