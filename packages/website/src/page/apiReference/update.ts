import { Effect, Match as M, Option, Record } from 'effect'
import { Runtime, Ui } from 'foldkit'

import { DisclosureToggled, type Message } from './message'
import type { Model } from './model'

export type UpdateReturn = [
  Model,
  ReadonlyArray<Runtime.Command<Message>>,
]
const withUpdateReturn = M.withReturnType<UpdateReturn>()

export const update = (
  model: Model,
  message: Message,
): UpdateReturn =>
  M.value(message).pipe(
    withUpdateReturn,
    M.tagsExhaustive({
      DisclosureToggled: ({ id, message }) =>
        Option.match(Record.get(model, id), {
          onNone: () => [model, []],
          onSome: (disclosure) => {
            const [nextDisclosure, commands] = Ui.Disclosure.update(
              disclosure,
              message,
            )

            return [
              Record.set(model, id, nextDisclosure),
              commands.map(
                Effect.map((message) =>
                  DisclosureToggled.make({ id, message }),
                ),
              ),
            ]
          },
        }),
    }),
  )
