import * as Shared from '@typing-game/shared'
import classNames from 'classnames'
import { Array, Match as M, Number, Option, Order, String as Str, pipe } from 'effect'
import { Html } from 'foldkit/html'

import { USER_TEXT_INPUT_ID } from '../constant'
import { StartGameRequested, UserTextInputted } from '../message'
import { Model, RoomPlayerSession } from '../model'
import { homeRouter } from '../route'
import { findFirstWrongCharIndex } from '../validation'
import { homeView } from './home'
import {
  Autocapitalize,
  Autocorrect,
  Class,
  Href,
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
  span,
  textarea,
} from './html'

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
      [],
      [span([Class('font-terminal text-3xl')], [player.username, isLocal ? ' [YOU]' : ''])],
    )
  })

const maybeRoomView = ({ maybeRoom, maybeSession, userText }: Model): Html =>
  Option.match(maybeRoom, {
    onNone: () => div([Class('text-terminal-green text-3xl')], ['LOADING SESSION...']),
    onSome: (room: Shared.Room) => {
      const maybeGameText = Option.map(room.maybeGame, ({ text }) => text)
      const maybeWrongCharIndex = Option.flatMap(maybeGameText, findFirstWrongCharIndex(userText))

      return M.value(room.status).pipe(
        M.tagsExhaustive({
          Waiting: () =>
            div(
              [],
              [
                div([Class('text-3xl uppercase uppercase')], ['[Connected users]']),
                div([Class('space-y-2')], playerView(room.players, maybeSession)),
                div([Class('text-3xl mt-4')], ['> Press enter to start game']),
              ],
            ),
          GetReady: () =>
            div(
              [Class('space-y-6')],
              [
                div([Class('text-3xl uppercase')], ['Preparing game...']),
                div([Class('h-px bg-terminal-green my-4')], []),
                Option.match(maybeGameText, {
                  onNone: () => empty,
                  onSome: (text) => div([Class('p-6 border-2 text-3xl')], [text]),
                }),
              ],
            ),
          Countdown: ({ secondsLeft }) =>
            div(
              [Class('space-y-6')],
              [
                div([Class('text-3xl uppercase')], [`Starting in ${secondsLeft}...`]),
                div([Class('h-px bg-terminal-green my-4')], []),
                Option.match(maybeGameText, {
                  onNone: () => empty,
                  onSome: (text) =>
                    div(
                      [
                        Class(
                          'p-6 border-2 border-terminal-green font-terminal text-3xl text-terminal-green-dim',
                        ),
                      ],
                      [text],
                    ),
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
    [Class('space-y-6')],
    [
      div([Class('text-3xl uppercase')], ['[Game complete]']),
      Option.match(maybeScoreboard, {
        onNone: () =>
          div([Class('text-terminal-green text-3xl uppercase')], ['Calculating results...']),
        onSome: scoreboardView,
      }),
      button(
        [
          Type('button'),
          Class(
            'w-full border-2 border-terminal-green text-terminal-green px-6 py-3 text-3xl font-terminal uppercase hover:bg-terminal-green hover:text-terminal-bg transition-all duration-200',
          ),
          OnClick(StartGameRequested.make({ roomId })),
        ],
        ['> Initialize new game'],
      ),
    ],
  )

const scoreboardView = (scoreboard: Shared.Scoreboard) => {
  const sortedScoreboard = Array.sort(scoreboard, byHighestWpm)

  return div(
    [Class('space-y-4')],
    [
      div([Class('text-3xl uppercase mb-4')], ['[FINAL SCORES]']),
      div(
        [Class('border-2 border-terminal-green box-glow')],
        [
          div(
            [
              Class(
                'grid grid-cols-4 gap-4 p-4 bg-terminal-bg border-b-2 border-terminal-green font-terminal text-3xl uppercase',
              ),
            ],
            [
              div([], ['Player']),
              div([Class('text-right')], ['WPM']),
              div([Class('text-right')], ['Accuracy']),
              div([Class('text-right')], ['Chars']),
            ],
          ),
          ...Array.map(sortedScoreboard, (score, index) => {
            const isFirst = index === 0

            return div(
              [
                Class(
                  classNames('grid grid-cols-4 gap-4 p-4 font-terminal text-3xl', {
                    'bg-terminal-bg border-b-2 border-terminal-green':
                      index < sortedScoreboard.length - 1,
                    'text-terminal-green terminal-glow': isFirst,
                    'text-terminal-green-dim': !isFirst,
                  }),
                ),
              ],
              [
                div(
                  [Class('font-medium')],
                  [isFirst ? '> ' : '  ', score.username, isFirst ? ' [WINNER]' : ''],
                ),
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
    [Class('space-y-6')],
    [
      div([Class('text-3xl uppercase')], [`[Time remaining] ${secondsLeft} seconds`]),
      div([Class('h-px bg-terminal-green my-4')], []),
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
    [Class('relative')],
    [
      textarea(
        [
          Id(USER_TEXT_INPUT_ID),
          Value(userText),
          Class('absolute inset-0 opacity-0 z-10 resize-none'),
          OnInput((value) => UserTextInputted.make({ value })),
          Spellcheck(false),
          Autocorrect('off'),
          Autocapitalize('none'),
        ],
        [],
      ),
      gameTextWithProgress(gameText, userText, maybeWrongCharIndex),
    ],
  )

const gameTextWithProgress = (
  gameText: string,
  userText: string,
  maybeWrongCharIndex: Option.Option<number>,
): Html =>
  div(
    [Class('text-3xl')],
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
      'char-untyped': index >= userTextLength && !isNextChar,
      'char-correct': index < userTextLength && !isWrongChar,
      'char-wrong': isWrongChar,
      'char-next': isNextChar,
    })

    return span([Class(charClassName)], [char])
  }

const roomRouteView = (model: Model, roomId: string): Html =>
  div(
    [Class('min-h-screen bg-terminal-bg font-terminal text-terminal-green p-8')],
    [
      div(
        [Class('max-w-4xl')],
        [
          div([Class('text-3xl uppercase')], ['[Room ID]']),
          div([Class('text-3xl mb-6')], [roomId]),
          maybeRoomView(model),
        ],
      ),
    ],
  )

const notFoundView = (path: string): Html =>
  div(
    [Class('min-h-screen bg-terminal-bg font-terminal text-terminal-green flex items-start p-8')],
    [
      div(
        [Class('max-w-4xl')],
        [
          div([Class('text-3xl uppercase mb-6')], ['[ERROR] 404 - PATH NOT FOUND']),
          div([Class('h-px bg-terminal-green my-6')], []),
          div([Class('text-3xl mb-6')], [`[INVALID PATH] "${path}"`]),
          div([Class('text-3xl mb-4')], ['The requested path does not exist in this terminal.']),
          div([Class('h-px bg-terminal-green my-6')], []),
          a(
            [
              Href(homeRouter.build({})),
              Class(
                'border-2 border-terminal-green text-terminal-green px-6 py-3 text-3xl font-terminal uppercase hover:bg-terminal-green hover:text-terminal-bg transition-all duration-200 inline-block',
              ),
            ],
            ['> RETURN TO HOME'],
          ),
        ],
      ),
    ],
  )

const bootView = (): Html =>
  div(
    [Class('min-h-screen bg-terminal-bg text-terminal-green font-terminal flex items-start p-8')],
    [
      div(
        [Class('max-w-4xl')],
        [
          div(
            [Class('text-3xl space-y-2')],
            [
              div([], ['Initializing...']),
              div([], ['Establishing connection...']),
              div(
                [Class('mt-4')],
                [span([Class('blink-cursor inline-block w-3 h-6 bg-terminal-green')], [])],
              ),
            ],
          ),
        ],
      ),
    ],
  )

export const view = (model: Model): Html => {
  if (model.bootStatus === 'Booting') {
    return bootView()
  }

  return M.value(model.route).pipe(
    M.tagsExhaustive({
      Home: () => homeView(model),
      Room: ({ roomId }) => roomRouteView(model, roomId),
      NotFound: ({ path }) => notFoundView(path),
    }),
  )
}
