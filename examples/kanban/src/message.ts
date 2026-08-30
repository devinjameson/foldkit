import { Schema as S } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

import { DragAndDrop } from '@foldkit/ui'

export const Message = defineMessageUnion({
  GotDragAndDropMessage: { message: DragAndDrop.Message },
  ClickedAddCard: { columnId: S.String },
  ChangedNewCardTitle: { value: S.String },
  SubmittedNewCard: {},
  CancelledNewCard: {},
  CompletedGenerateCardId: {
    cardId: S.String,
    columnId: S.String,
    title: S.String,
  },
  CompletedSaveBoard: {},
  CompletedFocusAddCardInput: {},
})

export type Message = typeof Message.Type
