import { Rpc, RpcGroup } from '@effect/rpc'
import { Schema as S } from 'effect'

export const Waiting = S.TaggedStruct('Waiting', {})
export const Countdown = S.TaggedStruct('Countdown', { secondsLeft: S.Number })
export const Playing = S.TaggedStruct('Playing', { secondsLeft: S.Number })
export const Finished = S.TaggedStruct('Finished', {})

export type Waiting = typeof Waiting.Type
export type Countdown = typeof Countdown.Type
export type Playing = typeof Playing.Type
export type Finished = typeof Finished.Type

export const GameStatus = S.Union(Waiting, Countdown, Playing, Finished)
export type GameStatus = typeof GameStatus.Type

export const Player = S.Struct({
  id: S.String,
  username: S.String,
})
export type Player = typeof Player.Type

export const Room = S.Struct({
  id: S.String,
  players: S.Array(Player),
  status: GameStatus,
  createdAt: S.Number,
})
export type Room = typeof Room.Type

export const Rooms = S.HashMap({ key: S.String, value: Room })
export type Rooms = typeof Rooms.Type

export class RoomNotFoundError extends S.TaggedError<RoomNotFoundError>()('RoomNotFoundError', {
  roomId: S.String,
}) {}

export const RoomAndPlayer = S.Struct({ player: Player, room: Room })
export type RoomAndPlayer = typeof RoomAndPlayer.Type

const createRoomRpc = Rpc.make('createRoom', {
  payload: S.Struct({ username: S.String }),
  success: RoomAndPlayer,
})

const joinRoomRpc = Rpc.make('joinRoom', {
  payload: S.Struct({ username: S.String, roomId: S.String }),
  success: RoomAndPlayer,
  error: RoomNotFoundError,
})

const getRoomByIdRpc = Rpc.make('getRoomById', {
  payload: S.Struct({ roomId: S.String }),
  success: Room,
  error: RoomNotFoundError,
})

const subscribeToRoomRpc = Rpc.make('subscribeToRoom', {
  payload: S.Struct({ roomId: S.String }),
  success: Room,
  error: RoomNotFoundError,
  stream: true,
})

const startGameRpc = Rpc.make('startGame', {
  payload: S.Struct({ roomId: S.String }),
  success: S.Void,
  error: RoomNotFoundError,
})

export class RoomRpcs extends RpcGroup.make(
  createRoomRpc,
  joinRoomRpc,
  getRoomByIdRpc,
  subscribeToRoomRpc,
  startGameRpc,
) {}
