import * as Shared from '@typing-game/shared'
import { Schema as S } from 'effect'
import { ts } from 'foldkit/schema'

import { RoomPlayerSession } from './model'

export const NoOp = ts('NoOp')
export const PressedKey = ts('PressedKey', { key: S.String })
export const InputtedUserText = ts('InputtedUserText', { value: S.String })
export const BlurredRoomPageUsernameInput = ts('BlurredRoomPageUsernameInput')
export const InputtedRoomPageUsername = ts('InputtedRoomPageUsername', { value: S.String })
export const SubmittedJoinRoomFromPage = ts('SubmittedJoinRoomFromPage', { roomId: S.String })
export const UpdatedRoom = ts('UpdatedRoom', {
  room: Shared.Room,
  maybePlayerProgress: S.Option(Shared.PlayerProgress),
})
export const RoomStreamError = ts('RoomStreamError', { error: S.String })
export const RequestedStartGame = ts('RequestedStartGame', { roomId: S.String, playerId: S.String })
export const LoadedSession = ts('LoadedSession', { maybeSession: S.Option(RoomPlayerSession) })
export const FetchedRoom = ts('FetchedRoom', { room: Shared.Room })
export const RoomNotFound = ts('RoomNotFound', { roomId: S.String })
export const ClickedCopyRoomId = ts('ClickedCopyRoomId', { roomId: S.String })
export const CopyRoomIdSuccess = ts('CopyRoomIdSuccess')
export const HiddenRoomIdCopiedIndicator = ts('HiddenRoomIdCopiedIndicator')
export const TickedExitCountdown = ts('TickedExitCountdown')
export const JoinedRoom = ts('JoinedRoom', { roomId: S.String, player: Shared.Player })

export const Message = S.Union(
  NoOp,
  PressedKey,
  InputtedUserText,
  BlurredRoomPageUsernameInput,
  InputtedRoomPageUsername,
  SubmittedJoinRoomFromPage,
  UpdatedRoom,
  RoomStreamError,
  RequestedStartGame,
  LoadedSession,
  FetchedRoom,
  RoomNotFound,
  ClickedCopyRoomId,
  CopyRoomIdSuccess,
  HiddenRoomIdCopiedIndicator,
  TickedExitCountdown,
  JoinedRoom,
)
export type Message = typeof Message.Type
