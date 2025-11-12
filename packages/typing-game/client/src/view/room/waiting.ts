import * as Shared from '@typing-game/shared'
import { Array, Option } from 'effect'
import { Html } from 'foldkit/html'

import { RoomPlayerSession } from '../../model'
import { Class, div, span } from '../html'

const isLocalPlayer = (
  player: Shared.Player,
  maybeSession: Option.Option<RoomPlayerSession>,
): boolean => Option.exists(maybeSession, (session) => session.player.id === player.id)

const player = (
  players: ReadonlyArray<Shared.Player>,
  maybeSession: Option.Option<RoomPlayerSession>,
): Html[] =>
  Array.map(players, (player) => {
    const isLocal = isLocalPlayer(player, maybeSession)

    return div(
      [],
      isLocal
        ? [span([], [player.username]), span([Class('uppercase')], [' [you]'])]
        : [span([], [player.username])],
    )
  })

export const waiting = (
  players: ReadonlyArray<Shared.Player>,
  maybeSession: Option.Option<RoomPlayerSession>,
): Html =>
  div(
    [],
    [
      div([Class('uppercase')], ['[Connected users]']),
      div([Class('space-y-2 mb-6')], player(players, maybeSession)),
      div([], ['> Enter to start game']),
    ],
  )
