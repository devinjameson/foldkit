import { Effect, Match as M, Option, Record } from 'effect'
import type { Command } from 'foldkit'
import { Ui } from 'foldkit'

import { GotFaqDisclosureMessage, type Message } from './message'
import type { Model } from './model'

export type UpdateReturn = [Model, ReadonlyArray<Command<Message>>]
const withUpdateReturn = M.withReturnType<UpdateReturn>()

export const update = (
  model: Model,
  message: Message,
): UpdateReturn =>
  M.value(message).pipe(
    withUpdateReturn,
    M.tagsExhaustive({
      GotFaqDisclosureMessage: ({ id, message }) =>
        Option.match(Record.get(model, id), {
          onNone: () => [model, []],
          onSome: disclosure => {
            const [nextDisclosure, commands] = Ui.Disclosure.update(
              disclosure,
              message,
            )

            return [
              Record.set(model, id, nextDisclosure),
              commands.map(
                Effect.map(message =>
                  GotFaqDisclosureMessage({ id, message }),
                ),
              ),
            ]
          },
        }),
    }),
  )
