import { Array, Match as M, Option, pipe } from 'effect'
import { Runtime, Task, Url } from 'foldkit'

import { loadSessionFromStorage } from './command'
import { USERNAME_INPUT_ID } from './constant'
import { Message, NoOp } from './message'
import { EnterUsername, Model } from './model'
import { urlToAppRoute } from './route'

export const init: Runtime.ApplicationInit<Model, Message> = (url: Url.Url) => {
  const route = urlToAppRoute(url)

  const maybeLoadSession = M.value(route).pipe(
    M.tag('Room', ({ roomId }) => loadSessionFromStorage(roomId)),
    M.option,
  )

  const maybeFocusUsernameInput = M.value(route).pipe(
    M.tag('Home', () => Task.focus(`#${USERNAME_INPUT_ID}`, () => NoOp.make())),
    M.option,
  )

  const commands = pipe(Array.getSomes([maybeLoadSession, maybeFocusUsernameInput]))

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
