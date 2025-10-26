import { Rpc, RpcGroup } from '@effect/rpc'
import { Schema as S } from 'effect'

export const GameStatus = S.Literal('Waiting', 'Countdown', 'Playing', 'Finished')
export type GameStatus = typeof GameStatus.Type

export const Player = S.Struct({
  id: S.String,
  username: S.String,
  position: S.Number,
  wpm: S.Number,
  accuracy: S.Number,
  isReady: S.Boolean,
})
export type Player = typeof Player.Type

export const Room = S.Struct({
  id: S.String,
  players: S.Array(Player),
  status: GameStatus,
  createdAt: S.Date,
})
export type Room = typeof Room.Type

export const PlayerReady = S.TaggedStruct('PlayerReady', {})
export type PlayerReady = typeof PlayerReady.Type

export const TypingProgress = S.TaggedStruct('TypingProgress', {
  position: S.Number,
  wpm: S.Number,
  accuracy: S.Number,
})
export type TypingProgress = typeof TypingProgress.Type

export const PlayerFinished = S.TaggedStruct('PlayerFinished', {
  wpm: S.Number,
  accuracy: S.Number,
  completedAt: S.Date,
})
export type PlayerFinished = typeof PlayerFinished.Type

export const ClientMessage = S.Union(PlayerReady, TypingProgress, PlayerFinished)
export type ClientMessage = typeof ClientMessage.Type

export const GameCountdown = S.TaggedStruct('GameCountdown', {
  seconds: S.Number,
})
export type GameCountdown = typeof GameCountdown.Type

export const GameStart = S.TaggedStruct('GameStart', {
  text: S.String,
  startedAt: S.Date,
})
export type GameStart = typeof GameStart.Type

export const PlayerUpdate = S.TaggedStruct('PlayerUpdate', {
  playerId: S.String,
  username: S.String,
  position: S.Number,
  wpm: S.Number,
  accuracy: S.Number,
})
export type PlayerUpdate = typeof PlayerUpdate.Type

export const GameEnd = S.TaggedStruct('GameEnd', {
  results: S.Array(
    S.Struct({
      playerId: S.String,
      username: S.String,
      wpm: S.Number,
      accuracy: S.Number,
      rank: S.Number,
    }),
  ),
})
export type GameEnd = typeof GameEnd.Type

export const ServerMessage = S.Union(GameCountdown, GameStart, PlayerUpdate, GameEnd)
export type ServerMessage = typeof ServerMessage.Type

export class RoomNotFoundError extends S.TaggedError<RoomNotFoundError>()('RoomNotFoundError', {
  roomId: S.String,
}) {}

export class RoomRpcs extends RpcGroup.make(
  Rpc.make('createRoom', {
    payload: S.Struct({ username: S.String }),
    success: Room,
  }),
  Rpc.make('joinRoom', {
    payload: S.Struct({ username: S.String, roomId: S.String }),
    success: Room,
    error: RoomNotFoundError,
  }),
  Rpc.make('getRoomById', {
    payload: S.Struct({ roomId: S.String }),
    success: Room,
    error: RoomNotFoundError,
  }),
  Rpc.make('subscribeToRoom', {
    payload: S.Struct({ roomId: S.String }),
    success: Room,
    error: RoomNotFoundError,
    stream: true,
  }),
) {}
