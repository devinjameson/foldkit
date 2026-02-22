import { Effect, Match as M } from 'effect'
import type { Command } from 'foldkit'
import { Task } from 'foldkit'

const ClickedResetAfterDelay = m('ClickedResetAfterDelay')
const ElapsedResetDelay = m('ElapsedResetDelay')

const update = (
  model: Model,
  message: Message,
): [Model, ReadonlyArray<Command<Message>>] =>
  M.value(message).pipe(
    M.withReturnType<[Model, ReadonlyArray<Command<Message>>]>(),
    M.tagsExhaustive({
      ClickedResetAfterDelay: () => [
        model,
        [Task.delay('1 second').pipe(Effect.as(ElapsedResetDelay()))],
      ],
      ElapsedResetDelay: () => [0, []],
    }),
  )
