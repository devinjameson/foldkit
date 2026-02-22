import { Duration, Effect } from 'effect'

/**
 * Waits for the given duration before completing.
 * Useful for debouncing, such as clearing a typeahead search query.
 *
 * @example
 * ```typescript
 * Task.delay('1 second').pipe(Effect.as(TimedOut()))
 * ```
 */
export const delay = (duration: Duration.DurationInput): Effect.Effect<void> =>
  Effect.sleep(duration)

/**
 * Completes after two animation frames, ensuring the browser has painted
 * the current state before proceeding. Used for CSS transition orchestration —
 * the double-rAF guarantees the "from" state is visible before transitioning
 * to the "to" state.
 *
 * @example
 * ```typescript
 * Task.nextFrame.pipe(Effect.as(TransitionFrameAdvanced()))
 * ```
 */
export const nextFrame: Effect.Effect<void> = Effect.async<void>(resume => {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      resume(Effect.void)
    })
  })
})

/**
 * Waits for all CSS transitions on the element matching the selector to complete.
 * Uses the Web Animations API for reliable detection. Falls back to completing
 * immediately if the element is missing or has no active transitions.
 *
 * @example
 * ```typescript
 * Task.waitForTransitions('#menu-items').pipe(Effect.as(TransitionEnded()))
 * ```
 */
export const waitForTransitions = (selector: string): Effect.Effect<void> =>
  Effect.async<void>(resume => {
    requestAnimationFrame(async () => {
      const element = document.querySelector(selector)

      const cssTransitions =
        element instanceof HTMLElement
          ? element
              .getAnimations()
              .filter(animation => 'transitionProperty' in animation)
          : []

      await Promise.allSettled(cssTransitions.map(({ finished }) => finished))

      resume(Effect.void)
    })
  })
