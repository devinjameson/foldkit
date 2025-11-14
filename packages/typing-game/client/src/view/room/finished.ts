import * as Shared from '@typing-game/shared'
import classNames from 'classnames'
import { Array, Number, Option, Order, pipe } from 'effect'
import { Html } from 'foldkit/html'

import { RoomPlayerSession } from '../../model'
import { Class, div, empty, span } from '../html'

const byHighestWpm = pipe(
  Number.Order,
  Order.mapInput(({ wpm }: Shared.PlayerScore) => wpm),
  Order.reverse,
)

const scoreboardView = (scoreboard: Shared.Scoreboard, hostId: string) => {
  const sortedScoreboard = Array.sort(scoreboard, byHighestWpm)

  return div(
    [Class('space-y-4')],
    [
      div(
        [Class('border-2 border-terminal-green box-glow')],
        [
          div(
            [Class('grid grid-cols-4 gap-4 p-4 border-b-2 border-terminal-green uppercase')],
            [
              div([], ['Player']),
              div([Class('text-right')], ['WPM']),
              div([Class('text-right')], ['Accuracy']),
              div([Class('text-right')], ['Chars']),
            ],
          ),
          ...Array.map(sortedScoreboard, (score, index) => {
            const isFirst = index === 0
            const isHost = score.playerId === hostId

            return div(
              [
                Class(
                  classNames('grid grid-cols-4 gap-4 p-4', {
                    'border-b-2 border-terminal-green':
                      index < Number.decrement(sortedScoreboard.length),
                  }),
                ),
              ],
              [
                div(
                  [],
                  [
                    isFirst ? '> ' : '  ',
                    score.username,
                    ...(isHost ? [span([Class('uppercase')], [' [host]'])] : []),
                  ],
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

export const finished = (
  maybeScoreboard: Option.Option<Shared.Scoreboard>,
  hostId: string,
  maybeSession: Option.Option<RoomPlayerSession>,
): Html => {
  const isLocalPlayerHost = Option.exists(maybeSession, (session) => session.player.id === hostId)

  return div(
    [Class('space-y-6')],
    [
      div([Class('uppercase')], ['[Game complete]']),
      Option.match(maybeScoreboard, {
        onNone: () => empty,
        onSome: (scoreboard) => scoreboardView(scoreboard, hostId),
      }),
      ...(isLocalPlayerHost ? [div([Class('mt-4')], ['> Enter to play again'])] : []),
    ],
  )
}
