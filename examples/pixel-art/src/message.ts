import { Schema as S } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

import { Dialog, Listbox, RadioGroup } from '@foldkit/ui'

import { PaletteIndex, Tool } from './model'

export const Message = defineMessageUnion({
  PressedCell: { x: S.Number, y: S.Number },
  EnteredCell: { x: S.Number, y: S.Number },
  LeftCanvas: {},
  ReleasedMouse: {},
  SelectedColor: { colorIndex: PaletteIndex },
  SelectedTool: { tool: Tool },
  SelectedGridSize: { size: S.Number },
  ToggledMirrorHorizontal: {},
  ToggledMirrorVertical: {},
  ClickedUndo: {},
  ClickedRedo: {},
  ClickedHistoryStep: { stepIndex: S.Number },
  ClickedRedoStep: { stepIndex: S.Number },
  ClickedClear: {},
  ClickedExport: {},
  SucceededExportPng: {},
  FailedExportPng: { error: S.String },
  GotErrorDialogMessage: { message: Dialog.Message },
  GotThemeListboxMessage: { message: Listbox.Message },
  GotToolRadioGroupMessage: { message: RadioGroup.Message },
  GotGridSizeRadioGroupMessage: { message: RadioGroup.Message },
  GotPaletteRadioGroupMessage: { message: RadioGroup.Message },
  ConfirmedGridSizeChange: {},
  GotGridSizeConfirmDialogMessage: { message: Dialog.Message },
  CompletedSaveCanvas: {},
})

export type Message = typeof Message.Type
