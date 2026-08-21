import { Match as M } from 'effect'
import { Command, Runtime, Url } from 'foldkit'

import { Message } from './message'
import { Model } from './model'
import { Home, Room } from './page'
import { urlToAppRoute } from './route'
import { RoomsClient } from './rpc'

export const init: Runtime.RoutingApplicationInit<
  Model,
  Message,
  void,
  RoomsClient
> = (url: Url.Url) => {
  const route = urlToAppRoute(url)

  const [home, homeCommands] = Home.init()
  const [room, roomCommands] = Room.init(route)

  const commands = M.value(route).pipe(
    M.tagsExhaustive({
      Home: () =>
        Command.mapMessages(homeCommands, message =>
          Message.GotHomeMessage({ message }),
        ),
      Room: () =>
        Command.mapMessages(roomCommands, message =>
          Message.GotRoomMessage({ message }),
        ),
      NotFound: () => [],
    }),
  )

  return [
    {
      route,
      home,
      room,
    },
    commands,
  ]
}
