import { Effect } from 'effect'
import { Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { evo } from 'foldkit/struct'

const Message = defineMessageUnion({
  ClickedResetAfterDelay: {},
  CompletedDelayReset: {},
})

const DelayReset = Command.define(
  // The identifier for the Command, surfaces in DevTools and Story/Scene tests
  'DelayReset',
  {
    // Every Message this Command can produce
    messages: [Message.CompletedDelayReset],
    // The Effect
    execute: Effect.sleep('1 second').pipe(
      Effect.as(Message.CompletedDelayReset()),
    ),
  },
)

const update = (model: Model, message: Message) =>
  Message.match<readonly [Model, ReadonlyArray<Command.Command<Message>>]>(
    message,
    {
      ClickedResetAfterDelay: () => [model, [DelayReset()]],
      CompletedDelayReset: () => [evo(model, { count: () => 0 }), []],
    },
  )
