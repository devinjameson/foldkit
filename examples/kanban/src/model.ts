import { Schema as S } from 'effect'

import { DragAndDrop } from '@foldkit/ui'

import { Column } from './domain'

export const SavedBoard = S.Struct({
  columns: S.Array(Column.Column),
})

export type SavedBoard = typeof SavedBoard.Type

export const SavedBoardJsonString = S.fromJsonString(S.toCodecJson(SavedBoard))

export const Model = S.Struct({
  columns: S.Array(Column.Column),
  dragAndDrop: DragAndDrop.Model,
  maybeNewCardColumnId: S.Option(S.String),
  newCardTitle: S.String,
  announcement: S.String,
})

export type Model = typeof Model.Type
