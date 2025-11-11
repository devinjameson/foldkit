import { Array, Effect, Match as M, Number, Option, String as Str, flow, pipe } from 'effect'
import { Runtime, Task, Url } from 'foldkit'
import { load, pushUrl } from 'foldkit/navigation'
import { evo } from 'foldkit/struct'

import {
  createRoom,
  joinRoom,
  navigateToRoom,
  savePlayerToSessionStorage,
  startGame,
  updatePlayerProgress,
} from '../command'
import { SESSION_ID_INPUT_ID, USERNAME_INPUT_ID } from '../constant'
import { CreateRoomClicked, Message, NoOp, StartGameRequested } from '../message'
import { EnterSessionId, EnterUsername, HOME_ACTIONS, Model, SelectAction } from '../model'
import { urlToAppRoute } from '../route'
import { validateUserTextInput } from '../validation'
import { handleRoomUpdated } from './handleRoomUpdated'

type UpdateReturn<Model, Message> = [Model, ReadonlyArray<Runtime.Command<Message>>]
const withUpdateReturn = M.withReturnType<UpdateReturn<Model, Message>>()

export const update = (model: Model, message: Message): UpdateReturn<Model, Message> =>
  M.value(message).pipe(
    withUpdateReturn,
    M.tagsExhaustive({
      NoOp: () => [model, []],

      BootCompleted: () => [
        evo(model, {
          bootStatus: () => 'Ready',
        }),
        [Task.focus(`#${USERNAME_INPUT_ID}`, () => NoOp.make())],
      ],

      UsernameFormSubmitted: () =>
        M.value(model.homeStep).pipe(
          withUpdateReturn,
          M.tag('EnterUsername', ({ username }) => {
            if (Str.isEmpty(username)) {
              return [model, []]
            }
            return [
              evo(model, {
                homeStep: () => SelectAction.make({ username, selectedAction: 'CreateRoom' }),
              }),
              [],
            ]
          }),
          M.orElse(() => [model, []]),
        ),

      KeyPressed: ({ key }) =>
        Option.match(model.maybeRoom, {
          onSome: (room) =>
            M.value(room.status).pipe(
              withUpdateReturn,
              M.tag('Waiting', () =>
                M.value(key).pipe(
                  withUpdateReturn,
                  M.when('Enter', () => [model, [Effect.succeed(StartGameRequested.make({ roomId: room.id }))]]),
                  M.orElse(() => [model, []]),
                ),
              ),
              M.orElse(() => [model, []]),
            ),
          onNone: () =>
            M.value(model.homeStep).pipe(
              withUpdateReturn,
              M.tag('SelectAction', ({ username, selectedAction }) => {
                const cycleAction = (offset: number) => {
                  const homeActionsLength = Array.length(HOME_ACTIONS)

                  return pipe(
                    HOME_ACTIONS,
                    Array.findFirstIndex((action) => action === selectedAction),
                    Option.map(
                      flow(
                        Number.sum(offset),
                        Number.remainder(homeActionsLength),
                        (remainder) => (remainder < 0 ? remainder + homeActionsLength : remainder),
                        (nextIndex) => Array.unsafeGet(HOME_ACTIONS, nextIndex),
                      ),
                    ),
                    Option.getOrThrow,
                  )
                }

                return M.value(key).pipe(
                  withUpdateReturn,
                  M.when('ArrowUp', () => [
                    evo(model, {
                      homeStep: () => SelectAction.make({ username, selectedAction: cycleAction(-1) }),
                    }),
                    [],
                  ]),
                  M.when('ArrowDown', () => [
                    evo(model, {
                      homeStep: () => SelectAction.make({ username, selectedAction: cycleAction(1) }),
                    }),
                    [],
                  ]),
                  M.when('Enter', () => {
                    return M.value(selectedAction).pipe(
                      withUpdateReturn,
                      M.when('CreateRoom', () => [model, [Effect.succeed(CreateRoomClicked.make())]]),
                      M.when('JoinRoom', () => [
                        evo(model, {
                          homeStep: () =>
                            EnterSessionId.make({ username, sessionId: '', sessionIdValidationId: 0 }),
                        }),
                        [Task.focus(`#${SESSION_ID_INPUT_ID}`, () => NoOp.make())],
                      ]),
                      M.when('ChangeUsername', () => [
                        evo(model, {
                          homeStep: () => EnterUsername.make({ username: '' }),
                        }),
                        [Task.focus(`#${USERNAME_INPUT_ID}`, () => NoOp.make())],
                      ]),
                      M.exhaustive,
                    )
                  }),
                  M.orElse(() => [model, []]),
                )
              }),
              M.orElse(() => [model, []]),
            ),
        }),

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

      UrlChanged: ({ url }) => [
        evo(model, {
          route: () => urlToAppRoute(url),
        }),
        [],
      ],

      UsernameInputted: ({ value }) =>
        M.value(model.homeStep).pipe(
          withUpdateReturn,
          M.tag('EnterUsername', () => [
            evo(model, {
              homeStep: () => EnterUsername.make({ username: value }),
              roomFormError: () => Option.none(),
            }),
            [],
          ]),
          M.orElse(() => [model, []]),
        ),

      UsernameInputBlurred: () => [model, [Task.focus(`#${USERNAME_INPUT_ID}`, () => NoOp.make())]],

      SessionIdInputBlurred: () => [
        model,
        [Task.focus(`#${SESSION_ID_INPUT_ID}`, () => NoOp.make())],
      ],

      RoomIdInputted: ({ value }) =>
        M.value(model.homeStep).pipe(
          withUpdateReturn,
          M.tag('EnterSessionId', ({ username, sessionIdValidationId }) => [
            evo(model, {
              homeStep: () =>
                EnterSessionId.make({
                  username,
                  sessionId: value,
                  sessionIdValidationId,
                }),
              roomFormError: () => Option.none(),
            }),
            [],
          ]),
          M.orElse(() => [model, []]),
        ),

      CreateRoomClicked: () =>
        M.value(model.homeStep).pipe(
          withUpdateReturn,
          M.tag('SelectAction', ({ username }) => [model, [createRoom(username)]]),
          M.orElse(() => [model, []]),
        ),

      JoinRoomClicked: () =>
        M.value(model.homeStep).pipe(
          withUpdateReturn,
          M.tag('EnterSessionId', ({ username, sessionId }) => {
            if (Str.isNonEmpty(sessionId)) {
              return [model, [joinRoom(username, sessionId)]]
            }
            return [model, []]
          }),
          M.orElse(() => [model, []]),
        ),

      RoomCreated: ({ roomId, player }) => {
        const session = { roomId, player }
        return [
          evo(model, {
            maybeSession: () => Option.some(session),
          }),
          [navigateToRoom(roomId), savePlayerToSessionStorage(session)],
        ]
      },

      RoomJoined: ({ roomId, player }) => {
        const session = { roomId, player }
        return [
          evo(model, {
            maybeSession: () => Option.some(session),
          }),
          [navigateToRoom(roomId), savePlayerToSessionStorage(session)],
        ]
      },

      RoomError: ({ error }) => [
        evo(model, {
          roomFormError: () => Option.some(error),
        }),
        [],
      ],

      RoomUpdated: handleRoomUpdated(model),

      RoomStreamError: ({ error }) => {
        console.error('Room stream error:', error)
        return [model, []]
      },

      StartGameRequested: ({ roomId }) => [model, [startGame(roomId)]],

      SessionLoaded: ({ maybeSession }) => [
        evo(model, {
          maybeSession: () => maybeSession,
        }),
        [],
      ],

      UserTextInputted: ({ value }) => {
        const maybeGameText = pipe(
          model.maybeRoom,
          Option.flatMap(({ maybeGame }) => maybeGame),
          Option.map(({ text }) => text),
        )

        const userText = validateUserTextInput(value, maybeGameText)

        const newCharsTyped = pipe(Str.length(userText) - Str.length(model.userText), Number.max(0))
        const nextCharsTyped = model.charsTyped + newCharsTyped

        const commands = pipe(
          Option.all([
            model.maybeSession,
            Option.flatMap(model.maybeRoom, ({ maybeGame }) => maybeGame),
          ]),
          Option.map(([session, game]) =>
            updatePlayerProgress(session.player.id, game.id, userText, nextCharsTyped),
          ),
        )

        return [
          evo(model, {
            userText: () => userText,
            charsTyped: () => nextCharsTyped,
          }),
          Array.fromOption(commands),
        ]
      },
    }),
  )
