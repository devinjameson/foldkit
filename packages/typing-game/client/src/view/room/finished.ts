import * as Shared from '@typing-game/shared'
import classNames from 'classnames'
import { Array, Number, Option, Order, pipe } from 'effect'
import { Html } from 'foldkit/html'

import { Class, div, empty } from '../html'

const byHighestWpm = pipe(
  Number.Order,
  Order.mapInput(({ wpm }: Shared.PlayerScore) => wpm),
  Order.reverse,
)

const scoreboard = (scoreboard: Shared.Scoreboard) => {
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

            return div(
              [
                Class(
                  classNames('grid grid-cols-4 gap-4 p-4', {
                    'border-b-2 border-terminal-green': index < sortedScoreboard.length - 1,
                    'text-terminal-green terminal-glow': isFirst,
                    'text-terminal-green-dim': !isFirst,
                  }),
                ),
              ],
              [
                div([Class('uppercase')], [isFirst ? '> ' : '  ', score.username]),
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

export const finished = (maybeScoreboard: Option.Option<Shared.Scoreboard>): Html =>
  div(
    [Class('space-y-6')],
    [
      div([Class('uppercase')], ['[Game complete]']),
      Option.match(maybeScoreboard, {
        onNone: () => empty,
        onSome: scoreboard,
      }),
      div([Class('mt-4')], ['> Enter to play again']),
    ],
  )
