import { Match as M, Schema as S } from 'effect'
import { ts } from 'foldkit/schema'

import { Message } from './message'
import { Model } from './model'

const ModelUpdated = ts('ModelUpdated', { model: Model })
const LogoutRequested = ts('LogoutRequested')

export const UpdateResult = S.Union(ModelUpdated, LogoutRequested)
export type UpdateResult = typeof UpdateResult.Type

export const update = (_model: Model, message: Message): UpdateResult =>
  M.value(message).pipe(
    M.tagsExhaustive({
      SettingsMessage: ({ message }) =>
        M.value(message).pipe(
          M.tagsExhaustive({
            LogoutClicked: () => LogoutRequested.make(),
          }),
        ),
    }),
  )
