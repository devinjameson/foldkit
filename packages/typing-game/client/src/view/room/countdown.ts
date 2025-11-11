import { Option } from 'effect'
import { Html } from 'foldkit/html'

import { Class, div, empty } from '../html'

export const countdown = (secondsLeft: number, maybeGameText: Option.Option<string>): Html =>
  div(
    [Class('space-y-6')],
    [
      div([Class('text-3xl uppercase')], [`Starting in ${secondsLeft}...`]),
      div([Class('h-px bg-terminal-green my-4')], []),
      Option.match(maybeGameText, {
        onNone: () => empty,
        onSome: (text) => div([Class('font-terminal text-3xl text-terminal-green-dim')], [text]),
      }),
    ],
  )
