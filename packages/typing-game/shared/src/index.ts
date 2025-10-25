import { Schema as S } from 'effect'

export const GameStatus = S.Literal('waiting', 'countdown', 'playing', 'finished')
export type GameStatus = typeof GameStatus.Type

export class Player extends S.Class<Player>('Player')({
  id: S.String,
  name: S.String,
  position: S.Number,
  wpm: S.Number,
  accuracy: S.Number,
  isReady: S.Boolean,
}) {}

export class Room extends S.Class<Room>('Room')({
  id: S.String,
  name: S.String,
  maxPlayers: S.Number,
  currentPlayers: S.Number,
  status: GameStatus,
  text: S.NullOr(S.String),
  createdAt: S.Date,
}) {}

export class PlayerReady extends S.TaggedClass<PlayerReady>()('PlayerReady', {}) {}

export class TypingProgress extends S.TaggedClass<TypingProgress>()('TypingProgress', {
  position: S.Number,
  wpm: S.Number,
  accuracy: S.Number,
}) {}

export class PlayerFinished extends S.TaggedClass<PlayerFinished>()('PlayerFinished', {
  wpm: S.Number,
  accuracy: S.Number,
  completedAt: S.Date,
}) {}

export const ClientMessage = S.Union(PlayerReady, TypingProgress, PlayerFinished)
export type ClientMessage = typeof ClientMessage.Type

export class GameCountdown extends S.TaggedClass<GameCountdown>()('GameCountdown', {
  seconds: S.Number,
}) {}

export class GameStart extends S.TaggedClass<GameStart>()('GameStart', {
  text: S.String,
  startedAt: S.Date,
}) {}

export class PlayerUpdate extends S.TaggedClass<PlayerUpdate>()('PlayerUpdate', {
  playerId: S.String,
  playerName: S.String,
  position: S.Number,
  wpm: S.Number,
  accuracy: S.Number,
}) {}

export class GameEnd extends S.TaggedClass<GameEnd>()('GameEnd', {
  results: S.Array(
    S.Struct({
      playerId: S.String,
      playerName: S.String,
      wpm: S.Number,
      accuracy: S.Number,
      rank: S.Number,
    }),
  ),
}) {}

export const ServerMessage = S.Union(GameCountdown, GameStart, PlayerUpdate, GameEnd)
export type ServerMessage = typeof ServerMessage.Type
