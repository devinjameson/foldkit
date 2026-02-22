import { Match as M, Option } from 'effect'
import type { Command } from 'foldkit'

export const update = (
  model: Model,
  message: Message,
): [
  Model,
  ReadonlyArray<Command<Message>>,
  Option.Option<OutMessage>,
] =>
  M.value(message).pipe(
    M.tagsExhaustive({
      ClickedLogout: () => [
        model,
        [],
        Option.some(RequestedLogout()),
      ],
    }),
  )
