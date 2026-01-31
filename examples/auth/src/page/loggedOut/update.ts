import { Array, Effect, Match as M, Option } from 'effect'
import { Runtime } from 'foldkit'
import { evo } from 'foldkit/struct'

import {
  LoginMessage,
  LoginSucceeded,
  Message,
  type OutMessage,
} from './message'
import { Model } from './model'
import * as Login from './page/login'

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
      LoginMessage: ({ message: loginMessage }) => {
        const [loginModel, commands, maybeOutMessage] = Login.update(
          model.loginModel,
          loginMessage,
        )

        const mappedCommands = Array.map(commands, (command) =>
          Effect.map(command, (message) => LoginMessage.make({ message })),
        )

        return [
          evo(model, { loginModel: () => loginModel }),
          mappedCommands,
          Option.map(maybeOutMessage, ({ session }) =>
            LoginSucceeded.make({ session }),
          ),
        ]
      },
    }),
  )
