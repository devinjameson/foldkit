import { Effect, Schema as S } from 'effect'
import { Command } from 'foldkit'
import { pushUrl } from 'foldkit/navigation'

import { CompletedNavigateToRoom } from './message'
import { roomRouter } from './route'

export const NavigateToRoom = Command.define('NavigateToRoom', {
  args: { roomId: S.String },
  messages: [CompletedNavigateToRoom],
  execute: ({ roomId }) =>
    pushUrl(roomRouter({ roomId })).pipe(Effect.as(CompletedNavigateToRoom())),
})
