import { Console, Data, Effect } from 'effect'
import {
  button,
  Command,
  div,
  OnClick,
  runApp,
  text,
  match,
  pure,
  effect,
  pureEffect,
  Class,
  Html,
} from '@foldkit/core'
import { DurationInput } from 'effect/Duration'

//
// MODEL
//

type Model = {
  count: number
}

const init: Model = {
  count: 0,
}

//
// UPDATE
//

type Message = Data.TaggedEnum<{
  Decrement: {}
  Increment: {}
  IncrementLater: {}
  SetCount: SetCountPayload
  LogAndSetCount: LogAndSetCountPayload
  SaveCount: {}
  SaveSuccess: SaveSuccessPayload
  None: {}
}>
const Message = Data.taggedEnum<Message>()

type SetCountPayload = { count: number }
type LogAndSetCountPayload = { count: number; id: string }
type SaveSuccessPayload = { savedCount: number }

const update = match<Model, Message>({
  Decrement: ({ count }) => pure({ count: count - 1 }),
  Increment: ({ count }) => pure({ count: count + 1 }),
  IncrementLater: effect(() => incrementLater('1 second')),

  SetCount: (_, { count }) => pure({ count }),
  LogAndSetCount: (_, { count, id }) => pureEffect({ count }, () => logCount({ count, id })),

  SaveCount: ({ count }) => pureEffect({ count }, () => saveToServer(count)),
  SaveSuccess: (_, { savedCount }) =>
    pureEffect({ count: savedCount }, () => logSaveSuccess(savedCount)),

  None: pure,
})

//
// COMMAND
//

const incrementLater = (duration: DurationInput): Command<Message> =>
  Effect.gen(function* () {
    yield* Console.log('Hold, please!')
    yield* Effect.sleep(duration)
    return Message.Increment()
  })

const logCount = ({ count, id }: { count: number; id: string }): Command<Message> =>
  Effect.gen(function* () {
    yield* Console.log(`${id}-${count}`)
    return Message.None()
  })

const saveToServer = (count: number): Command<Message> =>
  Effect.gen(function* () {
    yield* Console.log(`Saving count...`)
    yield* Effect.sleep('2 seconds')
    return Message.SaveSuccess({ savedCount: count })
  })

const logSaveSuccess = (savedCount: number): Command<Message> =>
  Effect.gen(function* () {
    yield* Console.log(`Saved ${savedCount}`)
    return Message.None()
  })

//
// VIEW
//

const view = (model: Model): Html =>
  div(
    [pageStyle],
    [
      div([countStyle], [text(String(model.count))]),
      div(
        [buttonRowStyle],
        [
          button([OnClick(Message.Decrement()), buttonStyle], ['-']),
          button([OnClick(Message.SetCount({ count: 0 })), buttonStyle], ['Reset']),
          button([OnClick(Message.SaveCount()), buttonStyle], ['Save']),
          button([OnClick(Message.IncrementLater()), buttonStyle], ['+ in 1s']),
          button([OnClick(Message.Increment()), buttonStyle], ['+']),
        ],
      ),
    ],
  )

//
// STYLE
//

const pageStyle = Class(
  'min-h-screen bg-gradient-to-br from-indigo-100 via-sky-100 to-emerald-100 flex flex-col items-center justify-center gap-6 p-6',
)

const countStyle = Class('text-6xl font-bold text-gray-800')

const buttonRowStyle = Class('flex flex-wrap justify-center gap-4')

const buttonStyle = Class(
  'bg-black text-white hover:bg-gray-900 px-4 py-2 rounded-lg shadow transition',
)

//
// RUN
//

runApp<Model, Message>({
  init,
  update,
  view,
  container: document.body,
})
