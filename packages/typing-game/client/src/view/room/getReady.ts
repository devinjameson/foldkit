import { Option } from 'effect'
import { Html } from 'foldkit/html'

import { Class, div, empty } from '../html'

export const getReady = (maybeGameText: Option.Option<string>): Html =>
  div(
    [Class('space-y-6')],
    [
      div([Class('uppercase')], ['Preparing game...']),
      div([Class('h-px bg-terminal-green my-4')], []),
      Option.match(maybeGameText, {
        onNone: () => empty,
        onSome: (text) => div([], [text]),
      }),
    ],
  )
