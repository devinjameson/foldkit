import { Schema as S } from 'effect'
import { m } from 'foldkit/message'

// MESSAGE

/** Sent when the pointer enters the tooltip trigger. */
export const EnteredTrigger = m('EnteredTrigger')
/** Sent when the pointer leaves the tooltip trigger. */
export const LeftTrigger = m('LeftTrigger')
/** Sent when focus enters the trigger. */
export const FocusedTrigger = m('FocusedTrigger')
/** Sent when focus leaves the trigger. */
export const BlurredTrigger = m('BlurredTrigger')
/** Sent when Escape is pressed while the tooltip is visible. */
export const PressedEscape = m('PressedEscape')
/** Sent when a pointer presses the trigger. Recorded so the focus that
 *  follows a mouse press can be told apart from focus that affirms the
 *  tooltip (keyboard, touch, or pen). */
export const PressedPointerOnTrigger = m('PressedPointerOnTrigger', {
  pointerType: S.String,
})
/** Sent when the show-delay timer fires. */
export const CompletedWaitBeforeShowing = m('CompletedWaitBeforeShowing', {
  version: S.Number,
})
/** Sent when the tooltip panel mounts and Floating UI has positioned it. */
export const CompletedAnchorTooltip = m('CompletedAnchorTooltip')

/** Union of all messages the tooltip component can produce. */
export const Message: S.Union<
  [
    typeof EnteredTrigger,
    typeof LeftTrigger,
    typeof FocusedTrigger,
    typeof BlurredTrigger,
    typeof PressedEscape,
    typeof PressedPointerOnTrigger,
    typeof CompletedWaitBeforeShowing,
    typeof CompletedAnchorTooltip,
  ]
> = S.Union([
  EnteredTrigger,
  LeftTrigger,
  FocusedTrigger,
  BlurredTrigger,
  PressedEscape,
  PressedPointerOnTrigger,
  CompletedWaitBeforeShowing,
  CompletedAnchorTooltip,
])

export type EnteredTrigger = typeof EnteredTrigger.Type
export type LeftTrigger = typeof LeftTrigger.Type
export type FocusedTrigger = typeof FocusedTrigger.Type
export type BlurredTrigger = typeof BlurredTrigger.Type
export type PressedEscape = typeof PressedEscape.Type
export type PressedPointerOnTrigger = typeof PressedPointerOnTrigger.Type

export type Message = typeof Message.Type

// OUT MESSAGE

/** Emitted once the tooltip transitions to visible (`isOpen` becomes true).
 *  Consumers typically use this for analytics, instrumentation, or to
 *  coordinate with other transient UI. */
export const Shown = m('Shown')

/** Emitted once the tooltip transitions to hidden (`isOpen` becomes false). */
export const Hidden = m('Hidden')

/** Union of out-messages the tooltip component can produce. */
export const OutMessage = S.Union([Shown, Hidden])

export type Shown = typeof Shown.Type
export type Hidden = typeof Hidden.Type
export type OutMessage = typeof OutMessage.Type
