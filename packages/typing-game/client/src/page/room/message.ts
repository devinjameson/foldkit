import * as Shared from '@typing-game/shared'
import { Schema as S } from 'effect'
import { ts } from 'foldkit/schema'

import { RoomPlayerSession } from './model'

export const NoOp = ts('NoOp')
export const PressedKey = ts('PressedKey', { key: S.String })
export const ChangedUserText = ts('ChangedUserText', { value: S.String })
export const BlurredRoomPageUsernameInput = ts('BlurredRoomPageUsernameInput')
export const ChangedRoomPageUsername = ts('ChangedRoomPageUsername', { value: S.String })
export const SubmittedJoinRoomFromPage = ts('SubmittedJoinRoomFromPage', { roomId: S.String })
export const UpdatedRoom = ts('UpdatedRoom', {
  room: Shared.Room,
  maybePlayerProgress: S.Option(Shared.PlayerProgress),
})
export const FailedRoomStream = ts('FailedRoomStream', { error: S.String })
export const RequestedStartGame = ts('RequestedStartGame', { roomId: S.String, playerId: S.String })
export const LoadedSession = ts('LoadedSession', { maybeSession: S.Option(RoomPlayerSession) })
export const SucceededRoomFetch = ts('SucceededRoomFetch', { room: Shared.Room })
export const FailedRoomFetch = ts('FailedRoomFetch', { roomId: S.String })
export const ClickedCopyRoomId = ts('ClickedCopyRoomId', { roomId: S.String })
export const SucceededCopyRoomId = ts('SucceededCopyRoomId')
export const HiddenRoomIdCopiedIndicator = ts('HiddenRoomIdCopiedIndicator')
export const TickedExitCountdown = ts('TickedExitCountdown')
export const JoinedRoom = ts('JoinedRoom', { roomId: S.String, player: Shared.Player })

export const Message = S.Union(
  NoOp,
  PressedKey,
  ChangedUserText,
  BlurredRoomPageUsernameInput,
  ChangedRoomPageUsername,
  SubmittedJoinRoomFromPage,
  UpdatedRoom,
  FailedRoomStream,
  RequestedStartGame,
  LoadedSession,
  SucceededRoomFetch,
  FailedRoomFetch,
  ClickedCopyRoomId,
  SucceededCopyRoomId,
  HiddenRoomIdCopiedIndicator,
  TickedExitCountdown,
  JoinedRoom,
)
export type Message = typeof Message.Type
