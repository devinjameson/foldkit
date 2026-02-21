import { Effect, Number } from 'effect'

const scrollLockState = {
  count: 0,
  overflow: '',
  paddingRight: '',
}

/**
 * Creates a command that locks page scroll by setting `overflow: hidden` on the
 * document element. Compensates for scrollbar width with padding to prevent layout
 * shift. Uses reference counting so nested locks are safe — the page only unlocks
 * when every lock has been released.
 *
 * @example
 * ```typescript
 * Task.lockScroll(() => NoOp())
 * ```
 */
export const lockScroll = <Message>(f: () => Message): Effect.Effect<Message> =>
  Effect.sync(() => {
    const {
      documentElement,
      documentElement: { style },
    } = document

    if (scrollLockState.count === 0) {
      scrollLockState.overflow = style.overflow
      scrollLockState.paddingRight = style.paddingRight

      const scrollbarWidth = window.innerWidth - documentElement.clientWidth

      style.overflow = 'hidden'
      style.paddingRight =
        scrollbarWidth > 0 ? `${scrollbarWidth}px` : style.paddingRight
    }

    scrollLockState.count++

    return f()
  })

/**
 * Creates a command that releases one scroll lock. When the last lock is released,
 * restores the original `overflow` and `padding-right` on the document element.
 *
 * @example
 * ```typescript
 * Task.unlockScroll(() => NoOp())
 * ```
 */
export const unlockScroll = <Message>(
  f: () => Message,
): Effect.Effect<Message> =>
  Effect.sync(() => {
    scrollLockState.count = Math.max(0, Number.decrement(scrollLockState.count))

    if (scrollLockState.count === 0) {
      const {
        documentElement: { style },
      } = document
      style.overflow = scrollLockState.overflow
      style.paddingRight = scrollLockState.paddingRight
    }

    return f()
  })
