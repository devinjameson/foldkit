import { Duration, Effect } from 'effect'

/**
 * Creates a command that resolves to a message after a delay.
 * Useful for debouncing, such as clearing a typeahead search query.
 *
 * @example
 * ```typescript
 * Task.delay(350, () => ClearedSearch({ version: model.searchVersion }))
 * Task.delay(Duration.seconds(1), () => TimedOut())
 * ```
 */
export const delay = <Message>(
  duration: Duration.DurationInput,
  f: () => Message,
): Effect.Effect<Message> =>
  Effect.gen(function* () {
    yield* Effect.sleep(duration)
    return f()
  })

/**
 * Creates a command that resolves to a message after two animation frames,
 * ensuring the browser has painted the current state before proceeding.
 * Used for CSS transition orchestration — the double-rAF guarantees the "from"
 * state is visible before transitioning to the "to" state.
 *
 * @example
 * ```typescript
 * Task.nextFrame(() => TransitionFrameAdvanced())
 * ```
 */
export const nextFrame = <Message>(f: () => Message): Effect.Effect<Message> =>
  Effect.async<Message>((resume) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        resume(Effect.succeed(f()))
      })
    })
  })

/**
 * Creates a command that waits for all CSS transitions on the element matching the selector
 * to complete, then resolves to a message. Uses the Web Animations API for reliable detection.
 * Falls back to resolving immediately if the element is missing or has no active transitions.
 *
 * @example
 * ```typescript
 * Task.waitForTransitions('#menu-items', () => TransitionEnded())
 * ```
 */
export const waitForTransitions = <Message>(
  selector: string,
  f: () => Message,
): Effect.Effect<Message> =>
  Effect.async<Message>((resume) => {
    requestAnimationFrame(async () => {
      const element = document.querySelector(selector)

      const cssTransitions =
        element instanceof HTMLElement
          ? element
              .getAnimations()
              .filter((animation) => 'transitionProperty' in animation)
          : []

      await Promise.allSettled(cssTransitions.map(({ finished }) => finished))

      resume(Effect.succeed(f()))
    })
  })
