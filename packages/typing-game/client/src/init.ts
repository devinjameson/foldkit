import { Array, Match as M, Option, pipe } from 'effect'
import { Runtime, Url } from 'foldkit'

import { bootSequence, loadSessionFromStorage } from './command'
import { Message } from './message'
import { EnterUsername, Model } from './model'
import { urlToAppRoute } from './route'

export const init: Runtime.ApplicationInit<Model, Message> = (url: Url.Url) => {
  const route = urlToAppRoute(url)

  const maybeLoadSession = M.value(route).pipe(
    M.tag('Room', ({ roomId }) => loadSessionFromStorage(roomId)),
    M.option,
  )

  const commands = pipe(Array.getSomes([maybeLoadSession]), Array.appendAll([bootSequence]))

  return [
    {
      bootStatus: 'Booting',
      route,
      homeStep: EnterUsername.make({ username: '' }),
      roomFormError: Option.none(),
      maybeRoom: Option.none(),
      maybeSession: Option.none(),
      userText: '',
      charsTyped: 0,
    },
    commands,
  ]
}
