import { Schema as S } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

/** Union of all messages the hover-intent component can produce. */
export const Message = defineMessageUnion({
  EnteredTrigger: {},
  LeftTrigger: {},
  EnteredPanel: {},
  LeftPanel: {},
  FocusedTrigger: {},
  BlurredTrigger: {},
  FocusedPanel: {},
  BlurredPanel: {},
  PressedEscape: {},
  CompletedWaitBeforeOpening: { version: S.Number },
  CompletedWaitBeforeClosing: { version: S.Number },
})

export type EnteredTrigger = typeof Message.EnteredTrigger.Type
export type LeftTrigger = typeof Message.LeftTrigger.Type
export type EnteredPanel = typeof Message.EnteredPanel.Type
export type LeftPanel = typeof Message.LeftPanel.Type
export type FocusedTrigger = typeof Message.FocusedTrigger.Type
export type BlurredTrigger = typeof Message.BlurredTrigger.Type
export type FocusedPanel = typeof Message.FocusedPanel.Type
export type BlurredPanel = typeof Message.BlurredPanel.Type
export type PressedEscape = typeof Message.PressedEscape.Type
export type CompletedWaitBeforeOpening =
  typeof Message.CompletedWaitBeforeOpening.Type
export type CompletedWaitBeforeClosing =
  typeof Message.CompletedWaitBeforeClosing.Type
export type Message = typeof Message.Type

/** Union of visibility transitions emitted by hover intent. */
export const OutMessage = defineMessageUnion({
  Opened: {},
  Closed: {},
})

export type Opened = typeof OutMessage.Opened.Type
export type Closed = typeof OutMessage.Closed.Type
export type OutMessage = typeof OutMessage.Type
