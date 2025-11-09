import * as Shared from '@typing-game/shared'
import classNames from 'classnames'
import { Array, Match as M, Number, Option, Order, String as Str, pipe } from 'effect'
import { Field } from 'foldkit/fieldValidation'
import {
  Autocapitalize,
  Autocorrect,
  Class,
  Disabled,
  For,
  Href,
  Html,
  Id,
  OnClick,
  OnInput,
  Spellcheck,
  Type,
  Value,
  a,
  button,
  div,
  empty,
  form,
  h1,
  h2,
  h3,
  input,
  label,
  span,
  textarea,
} from 'foldkit/html'

import { USER_TEXT_INPUT_ID } from './constant'
import {
  CreateRoomClicked,
  JoinRoomClicked,
  Message,
  RoomIdInputted,
  StartGameClicked,
  UserTextInputted,
  UsernameInputted,
} from './message'
import { Model, RoomPlayerSession } from './model'
import { homeRouter } from './route'
import { findFirstWrongCharIndex, isEveryFieldValid } from './validation'

const fieldView = (params: {
  id: string
  labelText: string
  field: Field<string>
  onInput: (value: string) => Message
  type?: 'text' | 'email' | 'textarea'
  containerClassName?: string
  inputClassName?: string
}): Html => {
  const {
    id,
    labelText,
    field,
    onInput,
    type = 'text',
    containerClassName,
    inputClassName,
  } = params
  const { value } = field

  const getBorderClass = () =>
    Field.$match(field, {
      NotValidated: () => 'border-gray-300',
      Validating: () => 'border-blue-300',
      Valid: () => 'border-green-500',
      Invalid: () => 'border-red-500',
    })

  const defaultInputClassName = `w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${getBorderClass()}`
  const inputClass = inputClassName || defaultInputClassName

  return div(
    [Class(classNames('mb-4', containerClassName))],
    [
      div(
        [Class('flex items-center gap-2 mb-2')],
        [
          label([For(id), Class('text-sm font-medium text-gray-700')], [labelText]),
          Field.$match(field, {
            NotValidated: () => empty,
            Validating: () => empty,
            Valid: () => span([Class('text-green-600 text-sm')], ['✓']),
            Invalid: () => empty,
          }),
        ],
      ),
      type === 'textarea'
        ? textarea([Id(id), Value(value), Class(inputClass), OnInput(onInput)])
        : input([Id(id), Type(type), Value(value), Class(inputClass), OnInput(onInput)]),

      Field.$match(field, {
        NotValidated: () => div([Class('invisible')], ['Not validated']),
        Validating: () => div([Class('text-blue-600 text-sm mt-1')], ['Checking...']),
        Valid: () => div([Class('invisible')], ['Valid']),
        Invalid: ({ error }) => div([Class('text-red-600 text-sm mt-1')], [error]),
      }),
    ],
  )
}

const homeView = (model: Model): Html => {
  const canCreateRoom = isEveryFieldValid([model.usernameInput])
  const canJoinRoom = isEveryFieldValid([model.usernameInput, model.roomIdInput])

  return div(
    [Class('min-h-screen bg-gray-100 flex items-center justify-center p-4')],
    [
      div(
        [Class('bg-white rounded-lg p-8 max-w-4xl w-full')],
        [
          h1(
            [Class('text-3xl font-bold text-gray-800 mb-6 text-center max-w-lg mx-auto')],
            ['Welcome to the Miney Miney Tiny Type Town!'],
          ),

          form(
            [Class('space-y-6')],
            [
              fieldView({
                id: 'username',
                labelText: 'Username',
                field: model.usernameInput,
                onInput: (value) => UsernameInputted.make({ value }),
                containerClassName: 'max-w-md mx-auto',
              }),

              div(
                [Class('grid grid-cols-1 md:grid-cols-2 gap-8')],
                [
                  div(
                    [Class('space-y-4 flex flex-col items-center justify-center py-8')],
                    [
                      h2([Class('text-xl font-semibold text-gray-700')], ['Create a Room']),
                      button(
                        [
                          Type('button'),
                          Disabled(!canCreateRoom),
                          Class(
                            classNames('w-full py-2 px-4 rounded-md transition', {
                              'bg-blue-500 text-white hover:bg-blue-600': canCreateRoom,
                              'bg-gray-300 text-gray-500 cursor-not-allowed': !canCreateRoom,
                            }),
                          ),
                          OnClick(CreateRoomClicked.make()),
                        ],
                        ['Create Room'],
                      ),
                    ],
                  ),

                  div(
                    [
                      Class(
                        'space-y-4 md:border-l md:border-gray-300 md:pl-8 flex flex-col items-center justify-center py-8',
                      ),
                    ],
                    [
                      h2([Class('text-xl font-semibold text-gray-700')], ['Join a Room']),
                      fieldView({
                        id: 'roomId',
                        labelText: 'Room ID',
                        field: model.roomIdInput,
                        onInput: (value) => RoomIdInputted.make({ value }),
                        containerClassName: 'w-full',
                      }),
                      button(
                        [
                          Type('button'),
                          Disabled(!canJoinRoom),
                          Class(
                            classNames('w-full py-2 px-4 rounded-md transition', {
                              'bg-blue-500 text-white hover:bg-blue-600': canJoinRoom,
                              'bg-gray-300 text-gray-500 cursor-not-allowed': !canJoinRoom,
                            }),
                          ),
                          OnClick(JoinRoomClicked.make()),
                        ],
                        ['Join Room'],
                      ),
                    ],
                  ),
                ],
              ),
              Option.match(model.roomFormError, {
                onNone: () => empty,
                onSome: (errorMessage) =>
                  div(
                    [Class('mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-center')],
                    [span([Class('text-red-600')], [errorMessage])],
                  ),
              }),
            ],
          ),
        ],
      ),
    ],
  )
}

const isLocalPlayer = (
  player: Shared.Player,
  maybeSession: Option.Option<RoomPlayerSession>,
): boolean => Option.exists(maybeSession, (session) => session.player.id === player.id)

const playerView = (
  players: ReadonlyArray<Shared.Player>,
  maybeSession: Option.Option<RoomPlayerSession>,
): Html[] =>
  Array.map(players, (player) => {
    const isLocal = isLocalPlayer(player, maybeSession)

    return div(
      [
        Class(
          classNames('p-3 rounded', {
            'bg-gray-200': !isLocal,
            'bg-green-200': isLocal,
          }),
        ),
      ],
      [span([Class('font-medium')], [player.username])],
    )
  })

const maybeRoomView = ({ maybeRoom, maybeSession, userText }: Model): Html =>
  Option.match(maybeRoom, {
    onNone: () => div([Class('text-gray-600')], ['Loading room...']),
    onSome: (room: Shared.Room) => {
      const maybeGameText = Option.map(room.maybeGame, ({ text }) => text)
      const maybeWrongCharIndex = Option.flatMap(maybeGameText, findFirstWrongCharIndex(userText))

      return M.value(room.status).pipe(
        M.tagsExhaustive({
          Waiting: () =>
            div(
              [Class('space-y-4')],
              [
                h2([Class('text-xl font-semibold text-gray-700 mb-4')], ['Players']),
                div([Class('space-y-2')], playerView(room.players, maybeSession)),
                button(
                  [
                    Type('button'),
                    Class(
                      classNames(
                        'w-full py-2 px-4 rounded-md transition bg-blue-500 text-white hover:bg-blue-600',
                      ),
                    ),
                    OnClick(StartGameClicked.make({ roomId: room.id })),
                  ],
                  ['Start Game'],
                ),
              ],
            ),
          GetReady: () =>
            div(
              [Class('space-y-4')],
              [
                div([Class('text-gray-600 text-lg')], ['Get ready! The game is about to start.']),
                Option.match(maybeGameText, {
                  onNone: () => empty,
                  onSome: (text) =>
                    div([Class('p-4 bg-gray-100 rounded font-mono text-gray-700')], [text]),
                }),
              ],
            ),
          Countdown: ({ secondsLeft }) =>
            div(
              [Class('space-y-4')],
              [
                div([Class('text-gray-600 text-lg')], [`Game starting in ${secondsLeft}`]),
                Option.match(maybeGameText, {
                  onNone: () => empty,
                  onSome: (text) =>
                    div([Class('p-4 bg-gray-100 rounded font-mono text-gray-700')], [text]),
                }),
              ],
            ),
          Playing: ({ secondsLeft }) =>
            playingView(secondsLeft, maybeGameText, userText, maybeWrongCharIndex),
          Finished: () => finishedView(room.id, room.maybeScoreboard),
        }),
      )
    },
  })

const byHighestWpm = pipe(
  Number.Order,
  Order.mapInput(({ wpm }: Shared.PlayerScore) => wpm),
  Order.reverse,
)

const finishedView = (roomId: string, maybeScoreboard: Option.Option<Shared.Scoreboard>): Html =>
  div(
    [Class('space-y-4')],
    [
      h2([Class('text-2xl font-bold text-gray-800')], ['Game finished!']),
      Option.match(maybeScoreboard, {
        onNone: () => div([Class('text-gray-600')], ['Loading scoreboard...']),
        onSome: scoreboardView,
      }),
      button(
        [
          Type('button'),
          Class('w-full py-2 px-4 rounded-md transition bg-blue-500 text-white hover:bg-blue-600'),
          OnClick(StartGameClicked.make({ roomId })),
        ],
        ['Play Again'],
      ),
    ],
  )

const scoreboardView = (scoreboard: Shared.Scoreboard) => {
  const sortedScoreboard = Array.sort(scoreboard, byHighestWpm)

  return div(
    [Class('space-y-4')],
    [
      h3([Class('text-xl font-semibold text-gray-700')], ['Scoreboard']),
      div(
        [Class('bg-white rounded-lg shadow overflow-hidden')],
        [
          div(
            [Class('grid grid-cols-4 gap-4 p-4 bg-gray-100 font-semibold text-gray-700')],
            [
              div([], ['Player']),
              div([Class('text-right')], ['WPM']),
              div([Class('text-right')], ['Accuracy']),
              div([Class('text-right')], ['Characters']),
            ],
          ),
          ...Array.map(sortedScoreboard, (score, index) => {
            const isFirst = index === 0
            return div(
              [
                Class(
                  classNames('grid grid-cols-4 gap-4 p-4 border-t', {
                    'bg-yellow-50': isFirst,
                    'bg-white': !isFirst,
                  }),
                ),
              ],
              [
                div([Class('font-medium')], [isFirst ? '🏆 ' : '', score.username]),
                div([Class('text-right')], [score.wpm.toFixed(1)]),
                div([Class('text-right')], [score.accuracy.toFixed(1) + '%']),
                div([Class('text-right')], [String(score.charsTyped)]),
              ],
            )
          }),
        ],
      ),
    ],
  )
}

const playingView = (
  secondsLeft: number,
  maybeGameText: Option.Option<string>,
  userText: string,
  maybeWrongCharIndex: Option.Option<number>,
): Html =>
  div(
    [Class('space-y-4')],
    [
      div([Class('text-gray-600 text-lg')], [`Time left: ${secondsLeft}`]),
      Option.match(maybeGameText, {
        onNone: () => empty,
        onSome: (gameText) => typingView(gameText, userText, maybeWrongCharIndex),
      }),
    ],
  )

const typingView = (
  gameText: string,
  userText: string,
  maybeWrongCharIndex: Option.Option<number>,
): Html =>
  div(
    [Class('relative focus-within:ring-blue-500 focus-within:ring-2 rounded transition-colors')],
    [
      textarea([
        Id(USER_TEXT_INPUT_ID),
        Value(userText),
        Class('absolute inset-0 opacity-0 z-10 resize-none'),
        OnInput((value) => UserTextInputted.make({ value })),
        Spellcheck(false),
        Autocorrect('off'),
        Autocapitalize('none'),
      ]),
      gameTextWithProgress(gameText, userText, maybeWrongCharIndex),
    ],
  )

const gameTextWithProgress = (
  gameText: string,
  userText: string,
  maybeWrongCharIndex: Option.Option<number>,
): Html =>
  div(
    [Class('p-4 bg-gray-100 rounded font-mono')],
    pipe(gameText, Str.split(''), Array.map(charView(userText, maybeWrongCharIndex))),
  )

const charView =
  (userText: string, maybeWrongCharIndex: Option.Option<number>) =>
  (char: string, index: number): Html => {
    const userTextLength = Str.length(userText)

    const isWrongChar = Option.exists(maybeWrongCharIndex, (wrongIndex) =>
      Order.between(Number.Order)(index, { minimum: wrongIndex, maximum: userTextLength - 1 }),
    )

    const isNextChar = index === userTextLength && Option.isNone(maybeWrongCharIndex)

    const charClassName = classNames({
      'text-gray-700': index >= userTextLength,
      'text-green-500': index < userTextLength && !isWrongChar,
      'text-red-500 underline': isWrongChar,
      underline: isNextChar,
    })

    return span([Class(charClassName)], [char])
  }

const roomRouteView = (model: Model, roomId: string): Html =>
  div(
    [Class('min-h-screen bg-gray-100 flex items-center justify-center p-4')],
    [
      div(
        [Class('bg-white rounded-lg p-8 max-w-4xl w-full')],
        [
          h1([Class('text-2xl font-bold text-gray-800 mb-6')], ['Room: ', roomId]),
          maybeRoomView(model),
        ],
      ),
    ],
  )

const notFoundView = (path: string): Html =>
  div(
    [Class('min-h-screen bg-gray-100 flex items-center justify-center')],
    [
      div(
        [Class('bg-white rounded-lg p-8 text-center')],
        [
          h1([Class('text-2xl font-bold text-gray-800 mb-4')], ['404 - Page Not Found']),
          div([Class('text-gray-600 mb-4')], [`The path "${path}" does not exist.`]),
          a(
            [Href(homeRouter.build({})), Class('text-blue-500 hover:text-blue-700')],
            ['Go back to home'],
          ),
        ],
      ),
    ],
  )

export const view = (model: Model): Html =>
  M.value(model.route).pipe(
    M.tagsExhaustive({
      Home: () => homeView(model),
      Room: ({ roomId }) => roomRouteView(model, roomId),
      NotFound: ({ path }) => notFoundView(path),
    }),
  )
