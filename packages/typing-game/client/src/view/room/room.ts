import * as Shared from '@typing-game/shared'
import { Match as M, Option } from 'effect'
import { Html } from 'foldkit/html'

import { Model } from '../../model'
import { findFirstWrongCharIndex } from '../../validation'
import { Class, div } from '../html'
import { countdown } from './countdown'
import { finished } from './finished'
import { getReady } from './getReady'
import { playing } from './playing'
import { waiting } from './waiting'

export const room = (model: Model, roomId: string): Html =>
  div(
    [Class('min-h-screen bg-terminal-bg font-terminal text-terminal-green p-8')],
    [
      div(
        [Class('max-w-4xl')],
        [
          div([Class('text-3xl uppercase')], ['[Room ID]']),
          div([Class('text-3xl mb-6')], [roomId]),
          content(model),
        ],
      ),
    ],
  )

const content = ({ maybeRoom, maybeSession, userText }: Model): Html =>
  Option.match(maybeRoom, {
    onNone: () => div([Class('text-terminal-green text-3xl')], ['Loading session...']),
    onSome: (room: Shared.Room) => {
      const maybeGameText = Option.map(room.maybeGame, ({ text }) => text)
      const maybeWrongCharIndex = Option.flatMap(maybeGameText, findFirstWrongCharIndex(userText))

      return M.value(room.status).pipe(
        M.tagsExhaustive({
          Waiting: () => waiting(room.players, maybeSession),
          GetReady: () => getReady(maybeGameText),
          Countdown: ({ secondsLeft }) => countdown(secondsLeft, maybeGameText),
          Playing: ({ secondsLeft }) =>
            playing(secondsLeft, maybeGameText, userText, maybeWrongCharIndex),
          Finished: () => finished(room.maybeScoreboard),
        }),
      )
    },
  })
