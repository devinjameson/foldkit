import { Array, Effect, Match as M, Number, Option, String as Str, pipe } from 'effect'
import { Runtime, Url } from 'foldkit'
import { Field, validateField } from 'foldkit/fieldValidation'
import { load, pushUrl } from 'foldkit/navigation'
import { evo } from 'foldkit/struct'

import {
  createRoom,
  joinRoom,
  navigateToRoom,
  savePlayerToSessionStorage,
  startGame,
  updatePlayerProgress,
  validateRoomJoinable,
} from '../command'
import {
  Message,
  NoOp,
} from '../message'
import { Model } from '../model'
import { urlToAppRoute } from '../route'
import {
  isAnyFieldNotValid,
  roomIdValidations,
  usernameValidations,
  validateUserTextInput,
} from '../validation'
import { handleRoomUpdated } from './handleRoomUpdated'

export const update = (
  model: Model,
  message: Message,
): [Model, ReadonlyArray<Runtime.Command<Message>>] =>
  M.value(message).pipe(
    M.withReturnType<[Model, ReadonlyArray<Runtime.Command<Message>>]>(),
    M.tagsExhaustive({
      NoOp: () => [model, []],

      LinkClicked: ({ request }) =>
        M.value(request).pipe(
          M.tagsExhaustive({
            Internal: ({ url }): [Model, ReadonlyArray<Runtime.Command<NoOp>>] => [
              model,
              [pushUrl(Url.toString(url)).pipe(Effect.as(NoOp.make()))],
            ],
            External: ({ href }): [Model, ReadonlyArray<Runtime.Command<NoOp>>] => [
              model,
              [load(href).pipe(Effect.as(NoOp.make()))],
            ],
          }),
        ),

      UrlChanged: ({ url }) => [
        evo(model, {
          route: () => urlToAppRoute(url),
        }),
        [],
      ],

      UsernameInputted: ({ value }) => [
        evo(model, {
          usernameInput: () => validateField(usernameValidations)(value),
          roomFormError: () => Option.none(),
        }),
        [],
      ],

      RoomIdInputted: ({ value }) => {
        const validateRoomIdResult = validateField(roomIdValidations)(value)
        const validationId = Number.increment(model.roomIdValidationId)

        if (Field.$is('Valid')(validateRoomIdResult)) {
          return [
            evo(model, {
              roomIdInput: () => Field.Validating({ value }),
              roomIdValidationId: () => validationId,
              roomFormError: () => Option.none(),
            }),
            [validateRoomJoinable(value, validationId)],
          ]
        } else {
          return [
            evo(model, {
              roomIdInput: () => validateRoomIdResult,
              roomIdValidationId: () => validationId,
              roomFormError: () => Option.none(),
            }),
            [],
          ]
        }
      },

      RoomIdValidated: ({ validationId, field }) => {
        if (validationId === model.roomIdValidationId) {
          return [
            evo(model, {
              roomIdInput: () => field,
            }),
            [],
          ]
        } else {
          return [model, []]
        }
      },

      CreateRoomClicked: () => {
        if (isAnyFieldNotValid([model.usernameInput])) {
          return [model, []]
        }

        return [model, [createRoom(model.usernameInput.value)]]
      },

      JoinRoomClicked: () => {
        if (isAnyFieldNotValid([model.usernameInput, model.roomIdInput])) {
          return [model, []]
        }

        return [model, [joinRoom(model.usernameInput.value, model.roomIdInput.value)]]
      },

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

      StartGameClicked: ({ roomId }) => [model, [startGame(roomId)]],

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
