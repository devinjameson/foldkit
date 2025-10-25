import * as Shared from '@typing-game/shared'
import { Array, Effect, Match as M } from 'effect'
import { Runtime, Task, Url } from 'foldkit'
import { load, pushUrl } from 'foldkit/navigation'
import { evo } from 'foldkit/struct'

import { navigateToRoom, savePlayerToSessionStorage } from './command'
import { USERNAME_INPUT_ID } from './constant'
import { HomeMessage, Message, NoOp, RoomMessage } from './message'
import { Model } from './model'
import { Home, Room } from './page'
import { urlToAppRoute } from './route'

export type UpdateReturn<Model, Message> = [Model, ReadonlyArray<Runtime.Command<Message>>]
const withUpdateReturn = M.withReturnType<UpdateReturn<Model, Message>>()

export const update = (model: Model, message: Message): UpdateReturn<Model, Message> =>
  M.value(message).pipe(
    withUpdateReturn,
    M.tagsExhaustive({
      NoOp: () => [model, []],

      LinkClicked: ({ request }) =>
        M.value(request).pipe(
          withUpdateReturn,
          M.tagsExhaustive({
            Internal: ({ url }) => [
              model,
              [pushUrl(Url.toString(url)).pipe(Effect.as(NoOp.make()))],
            ],
            External: ({ href }) => [model, [load(href).pipe(Effect.as(NoOp.make()))]],
          }),
        ),

      UrlChanged: ({ url }) => {
        const nextRoute = urlToAppRoute(url)
        const maybeFocusUsernameInput = M.value(nextRoute).pipe(
          M.tag('Home', () => Task.focus(`#${USERNAME_INPUT_ID}`, () => NoOp.make())),
          M.option,
        )
        return [
          evo(model, {
            route: () => nextRoute,
          }),
          Array.fromOption(maybeFocusUsernameInput),
        ]
      },

      HomeMessage: ({ message: homeMessage }) => {
        const [nextHomeModel, homeComands] = Home.update(model.home, homeMessage)

        const additionalCommands = M.value(homeMessage).pipe(
          M.tag('RoomCreated', ({ roomId, player }) => handleRoomJoined(roomId, player)),
          M.tag('RoomJoined', ({ roomId, player }) => handleRoomJoined(roomId, player)),
          M.tag('RoomError', ({ error }) => [
            Effect.succeed(RoomMessage.make({ message: Room.Message.RoomError.make({ error }) })),
          ]),
          M.orElse(() => []),
        )

        return [
          evo(model, {
            home: () => nextHomeModel,
          }),
          [
            ...homeComands.map(Effect.map((message) => HomeMessage.make({ message }))),
            ...additionalCommands,
          ],
        ]
      },

      RoomMessage: ({ message: roomMessage }) => {
        const [nextRoomModel, roomCommands] = Room.update(model.room, roomMessage)

        return [
          evo(model, {
            room: () => nextRoomModel,
          }),
          roomCommands.map(Effect.map((message) => RoomMessage.make({ message }))),
        ]
      },
    }),
  )

const handleRoomJoined = (roomId: string, player: Shared.Player) => {
  const session = { roomId, player }
  return [
    navigateToRoom(roomId),
    savePlayerToSessionStorage(session),
    Effect.succeed(RoomMessage.make({ message: Room.Message.RoomJoined.make({ roomId, player }) })),
  ]
}
