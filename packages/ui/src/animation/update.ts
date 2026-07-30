import { Effect, Match as M, Option, Schema as S } from 'effect'
import * as Command from 'foldkit/command'
import * as Dom from 'foldkit/dom'
import * as Render from 'foldkit/render'
import { evo } from 'foldkit/struct'

import { idSelector } from '../internal/selectors.js'
import {
  CompletedWaitForPaint,
  EndedAnimation,
  type Message,
  type Model,
  type OutMessage,
  StartedLeaveAnimating,
  TransitionedOut,
} from './schema.js'

// UPDATE

const elementSelector = (id: string): string => idSelector(id)

type UpdateReturn = readonly [
  Model,
  ReadonlyArray<Command.Command<Message>>,
  Option.Option<OutMessage>,
]
const withUpdateReturn = M.withReturnType<UpdateReturn>()

/** Waits for paint via double-rAF before the enter/leave lifecycle advances. */
export const WaitForPaint = Command.define('WaitForPaint', {
  messages: [CompletedWaitForPaint],
  execute: Render.afterPaint.pipe(Effect.as(CompletedWaitForPaint())),
})
/** Waits for all CSS animations on the element to settle. Covers both CSS transitions and CSS keyframe animations. */
export const WaitForAnimationSettled = Command.define(
  'WaitForAnimationSettled',
  {
    args: { id: S.String },
    messages: [EndedAnimation],
    execute: ({ id }) =>
      Dom.waitForAnimationSettled(elementSelector(id)).pipe(
        Effect.as(EndedAnimation()),
      ),
  },
)

/** Processes an animation message and returns the next model, commands, and optional OutMessage. */
export const update = (model: Model, message: Message): UpdateReturn => {
  const maybeNextFrame = WaitForPaint()

  return M.value(message).pipe(
    withUpdateReturn,
    M.tagsExhaustive({
      Showed: () => {
        if (model.isShowing) {
          return [model, [], Option.none()]
        }

        return [
          evo(model, {
            isShowing: () => true,
            transitionState: () => 'EnterStart',
          }),
          [maybeNextFrame],
          Option.none(),
        ]
      },

      Hid: () => {
        const isLeaving =
          model.transitionState === 'LeaveStart' ||
          model.transitionState === 'LeaveAnimating'

        if (isLeaving || !model.isShowing) {
          return [model, [], Option.none()]
        }

        return [
          evo(model, {
            isShowing: () => false,
            transitionState: () => 'LeaveStart',
          }),
          [maybeNextFrame],
          Option.none(),
        ]
      },

      CompletedWaitForPaint: () =>
        M.value(model.transitionState).pipe(
          withUpdateReturn,
          M.when('EnterStart', () => [
            evo(model, { transitionState: () => 'EnterAnimating' }),
            [WaitForAnimationSettled({ id: model.id })],
            Option.none(),
          ]),
          M.when('LeaveStart', () => [
            evo(model, { transitionState: () => 'LeaveAnimating' }),
            [],
            Option.some(StartedLeaveAnimating()),
          ]),
          M.orElse(() => [model, [], Option.none()]),
        ),

      EndedAnimation: () =>
        M.value(model.transitionState).pipe(
          withUpdateReturn,
          M.when('EnterAnimating', () => [
            evo(model, { transitionState: () => 'Idle' }),
            [],
            Option.none(),
          ]),
          M.when('LeaveAnimating', () => [
            evo(model, { transitionState: () => 'Idle' }),
            [],
            Option.some(TransitionedOut()),
          ]),
          M.orElse(() => [model, [], Option.none()]),
        ),
    }),
  )
}

/** Creates the standard leave-phase command that waits for CSS animations on the element to settle. Use this when handling the `StartedLeaveAnimating` OutMessage for components that don't need custom leave behavior. */
export const defaultLeaveCommand = (model: Model): Command.Command<Message> =>
  WaitForAnimationSettled({ id: model.id })
