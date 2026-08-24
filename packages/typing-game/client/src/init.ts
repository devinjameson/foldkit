import { Match as M } from 'effect'
import { Command, Runtime, type Update, Url } from 'foldkit'

import { Message } from './message'
import { Model } from './model'
import { Home, Room } from './page'
import { urlToAppRoute } from './route'
import { RoomsClient } from './rpc'

type InitCommands = Update.Commands<Message, RoomsClient>

export const init: Runtime.RoutingApplicationInit<
  Model,
  Message,
  void,
  RoomsClient
> = (url: Url.Url) => {
  const route = urlToAppRoute(url)

  const homeInit = Home.init()
  const roomInit = Room.init(route)

  const commands = M.value(route).pipe(
    M.withReturnType<InitCommands>(),
    M.tagsExhaustive({
      Home: () =>
        Command.mapMessages(homeInit.commands, message =>
          Message.GotHomeMessage({ message }),
        ),
      Room: () =>
        Command.mapMessages(roomInit.commands, message =>
          Message.GotRoomMessage({ message }),
        ),
      NotFound: () => [],
    }),
  )

  const model = {
    route,
    home: homeInit.model,
    room: roomInit.model,
  }
  return { model, commands }
}
