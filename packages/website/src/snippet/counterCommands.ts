import { Effect, Match as M } from 'effect'
import { Command } from 'foldkit'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

const ClickedResetAfterDelay = m('ClickedResetAfterDelay')
const CompletedDelayReset = m('CompletedDelayReset')

const DelayReset = Command.define(
  // The identifier for the Command, surfaces in DevTools and Story/Scene tests
  'DelayReset',
  {
    // Every Message this Command can produce
    messages: [CompletedDelayReset],
    // The Effect
    execute: Effect.sleep('1 second').pipe(Effect.as(CompletedDelayReset())),
  },
)

const update = (
  model: Model,
  message: Message,
): readonly [Model, ReadonlyArray<Command.Command<Message>>] =>
  M.value(message).pipe(
    M.withReturnType<
      readonly [Model, ReadonlyArray<Command.Command<Message>>]
    >(),
    M.tagsExhaustive({
      ClickedResetAfterDelay: () => [model, [DelayReset()]],
      CompletedDelayReset: () => [evo(model, { count: () => 0 }), []],
    }),
  )
