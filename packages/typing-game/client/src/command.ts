import { Effect, Schema as S } from 'effect'
import { Command } from 'foldkit'
import { pushUrl } from 'foldkit/navigation'

import { Message } from './message'
import { roomRouter } from './route'

export const NavigateToRoom = Command.define('NavigateToRoom', {
  args: { roomId: S.String },
  messages: [Message.CompletedNavigateToRoom],
  execute: ({ roomId }) =>
    pushUrl(roomRouter({ roomId })).pipe(
      Effect.as(Message.CompletedNavigateToRoom()),
    ),
})
