import { Duration, Schema as S } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

import {
  Message as AnimationMessage,
  Model as AnimationModel,
} from '../animation/schema.js'

// VARIANT

/** Semantic category of a toast. Drives the default ARIA role: `status` for
 *  `Info` / `Success`, `alert` for `Warning` / `Error`. Also surfaced as
 *  `data-variant` on each entry for per-variant CSS. This is the only
 *  content-adjacent field the component owns. The rest of the entry's
 *  content lives in the user-provided payload. */
export const Variant = S.Literals(['Info', 'Success', 'Warning', 'Error'])
export type Variant = typeof Variant.Type

// POSITION

/** Where the toast viewport is anchored on the screen and how entries stack. */
export const Position = S.Literals([
  'TopLeft',
  'TopCenter',
  'TopRight',
  'BottomLeft',
  'BottomCenter',
  'BottomRight',
])
export type Position = typeof Position.Type

// ENTRY

/** Schema factory for a single toast entry. `payloadSchema` is user-provided
 *  and defines the shape of per-entry content, whatever the consumer wants
 *  to encode. The component itself owns only lifecycle + a11y fields: `id`,
 *  `variant` (for ARIA role), `animation`, `maybeDuration`,
 *  `pendingDismissVersion` (for cancellable auto-dismiss), and `isHovered`
 *  (for pause-on-hover). */
export const makeEntry = <A, I>(payloadSchema: S.Codec<A, I>) =>
  S.Struct({
    id: S.String,
    variant: Variant,
    animation: AnimationModel,
    maybeDuration: S.Option(S.DurationFromMillis),
    pendingDismissVersion: S.Number,
    isHovered: S.Boolean,
    payload: payloadSchema,
  })

// MODEL

/** Schema factory for the toast container's state. `nextEntryKey` is a
 *  monotonic counter used to generate unique entry IDs purely from Model
 *  state. Thread the updated model through successive `show()` calls.
 *  Calling `show()` twice against the same pre-update model in the same tick
 *  will produce duplicate entry IDs. */
export const makeModel = <A, I>(payloadSchema: S.Codec<A, I>) =>
  S.Struct({
    id: S.String,
    defaultDuration: S.DurationFromMillis,
    entries: S.Array(makeEntry(payloadSchema)),
    nextEntryKey: S.Number,
  })

// MESSAGE

/** Payload-independent Message variants shared by every bound Toast module. */
export const Message = defineMessageUnion({
  Dismissed: { entryId: S.String },
  DismissedAll: {},
  CompletedWaitBeforeDismissal: {
    entryId: S.String,
    version: S.Number,
  },
  HoveredEntry: { entryId: S.String },
  LeftEntry: { entryId: S.String },
  GotAnimationMessage: {
    entryId: S.String,
    message: AnimationMessage,
  },
})

export type Dismissed = typeof Message.Dismissed.Type
export type DismissedAll = typeof Message.DismissedAll.Type
export type CompletedWaitBeforeDismissal =
  typeof Message.CompletedWaitBeforeDismissal.Type
export type HoveredEntry = typeof Message.HoveredEntry.Type
export type LeftEntry = typeof Message.LeftEntry.Type
export type GotAnimationMessage = typeof Message.GotAnimationMessage.Type

/** Factory for the union of all messages the toast component can produce. */
export const makeMessage = <A, I>(payloadSchema: S.Codec<A, I>) =>
  defineMessageUnion({
    Added: { entry: makeEntry(payloadSchema) },
    Dismissed: { entryId: S.String },
    DismissedAll: {},
    CompletedWaitBeforeDismissal: {
      entryId: S.String,
      version: S.Number,
    },
    HoveredEntry: { entryId: S.String },
    LeftEntry: { entryId: S.String },
    GotAnimationMessage: {
      entryId: S.String,
      message: AnimationMessage,
    },
  })

/** Factory for the union of out-messages the toast component can produce. */
export const makeOutMessage = <A, I>(payloadSchema: S.Codec<A, I>) =>
  defineMessageUnion({ DismissedToast: { payload: payloadSchema } })

// INIT

/** Configuration for creating a toast container model. `defaultDuration` is
 *  applied to any `show()` call that doesn't provide its own `duration` or
 *  pass `sticky: true`. Accepts any Effect Duration input; a bare number is
 *  interpreted as milliseconds. */
export type InitConfig = Readonly<{
  id: string
  defaultDuration?: Duration.Input
}>

export const DEFAULT_DURATION = Duration.seconds(4)
