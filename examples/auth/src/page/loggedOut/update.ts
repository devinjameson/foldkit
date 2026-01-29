import { Match as M, Schema as S } from 'effect'
import { ts } from 'foldkit/schema'
import { evo } from 'foldkit/struct'

import { Session } from '../../domain/session'
import { Message } from './message'
import { Model } from './model'
import * as Login from './page/login'

const ModelUpdated = ts('ModelUpdated', { model: Model })
const LoginSucceeded = ts('LoginSucceeded', { session: Session })

export const UpdateResult = S.Union(ModelUpdated, LoginSucceeded)
export type UpdateResult = typeof UpdateResult.Type

export const update = (model: Model, message: Message): UpdateResult =>
  M.value(message).pipe(
    M.withReturnType<UpdateResult>(),
    M.tagsExhaustive({
      LoginMessage: ({ message }) => {
        const result = Login.update(model.loginForm, message)

        return M.value(result).pipe(
          M.withReturnType<UpdateResult>(),
          M.tagsExhaustive({
            ModelUpdated: ({ model: loginModel }) =>
              ModelUpdated.make({
                model: evo(model, {
                  loginForm: () => loginModel,
                }),
              }),
            LoginSucceeded: ({ session }) => LoginSucceeded.make({ session }),
          }),
        )
      },
    }),
  )
