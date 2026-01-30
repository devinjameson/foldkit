import { Match as M, Option } from 'effect'
import { Runtime } from 'foldkit'
import { evo } from 'foldkit/struct'

import { Message, type OutMessage } from './message'
import { Model } from './model'
import * as Login from './page/login'

// UPDATE

type UpdateReturn = [
  Model,
  ReadonlyArray<Runtime.Command<Message>>,
  Option.Option<OutMessage>,
]
const withUpdateReturn = M.withReturnType<UpdateReturn>()

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    withUpdateReturn,
    M.tagsExhaustive({
      LoginMessage: ({ message }) => {
        const [loginModel, _commands, outMessage] = Login.update(
          model.loginModel,
          message,
        )

        return [evo(model, { loginModel: () => loginModel }), [], outMessage]
      },
    }),
  )
