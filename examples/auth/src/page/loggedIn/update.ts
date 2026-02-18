import { Match as M, Option } from 'effect'
import { Runtime } from 'foldkit'

import { LogoutRequested, Message, type OutMessage } from './message'
import { Model } from './model'

type UpdateReturn = [
  Model,
  ReadonlyArray<Runtime.Command<Message>>,
  Option.Option<OutMessage>,
]
const withUpdateReturn = M.withReturnType<UpdateReturn>()

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    M.tagsExhaustive({
      GotSettingsMessage: ({ message }) =>
        M.value(message).pipe(
          withUpdateReturn,
          M.tagsExhaustive({
            LogoutClicked: () => [model, [], Option.some(LogoutRequested())],
          }),
        ),
    }),
  )
