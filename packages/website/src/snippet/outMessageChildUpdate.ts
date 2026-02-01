import { Match as M, Option } from 'effect'
import { Runtime } from 'foldkit'

export const update = (
  model: Model,
  message: Message,
): [
  Model,
  ReadonlyArray<Runtime.Command<Message>>,
  Option.Option<OutMessage>,
] =>
  M.value(message).pipe(
    M.tagsExhaustive({
      LogoutClicked: () => [
        model,
        [],
        Option.some(LogoutRequested.make()),
      ],
    }),
  )
