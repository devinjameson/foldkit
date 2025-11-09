import { Match as M, Option } from 'effect'
import { Runtime, Url } from 'foldkit'
import { Field } from 'foldkit/fieldValidation'

import { loadSessionFromStorage } from './command'
import { Message } from './message'
import { Model } from './model'
import { urlToAppRoute } from './route'

export const init: Runtime.ApplicationInit<Model, Message> = (url: Url.Url) => {
  const route = urlToAppRoute(url)
  const commands = M.value(route).pipe(
    M.tag('Room', ({ roomId }) => [loadSessionFromStorage(roomId)]),
    M.orElse(() => []),
  )

  return [
    {
      route,
      usernameInput: Field.NotValidated({ value: '' }),
      roomIdInput: Field.NotValidated({ value: '' }),
      roomIdValidationId: 0,
      roomFormError: Option.none(),
      maybeRoom: Option.none(),
      maybeSession: Option.none(),
      userText: '',
      charsTyped: 0,
    },
    commands,
  ]
}
