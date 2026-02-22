import { Effect } from 'effect'

import { ElementNotFound } from './error'

/**
 * Focuses an element matching the given selector.
 * Uses requestAnimationFrame to ensure the DOM is updated before attempting to focus.
 * Fails with `ElementNotFound` if the selector does not match an `HTMLElement`.
 *
 * @example
 * ```typescript
 * Task.focus('#email-input').pipe(Effect.ignore, Effect.as(NoOp()))
 * ```
 */
export const focus = (selector: string): Effect.Effect<void, ElementNotFound> =>
  Effect.async<void, ElementNotFound>(resume => {
    requestAnimationFrame(() => {
      const element = document.querySelector(selector)
      if (element instanceof HTMLElement) {
        element.focus()
        resume(Effect.void)
      } else {
        resume(Effect.fail(new ElementNotFound({ selector })))
      }
    })
  })

/**
 * Opens a dialog element as a modal using `showModal()`.
 * Uses requestAnimationFrame to ensure the DOM is updated before attempting to show.
 * Fails with `ElementNotFound` if the selector does not match an `HTMLDialogElement`.
 *
 * @example
 * ```typescript
 * Task.showModal('#my-dialog').pipe(Effect.ignore, Effect.as(NoOp()))
 * ```
 */
export const showModal = (
  selector: string,
): Effect.Effect<void, ElementNotFound> =>
  Effect.async<void, ElementNotFound>(resume => {
    requestAnimationFrame(() => {
      const element = document.querySelector(selector)
      if (element instanceof HTMLDialogElement) {
        element.showModal()
        resume(Effect.void)
      } else {
        resume(Effect.fail(new ElementNotFound({ selector })))
      }
    })
  })

/**
 * Closes a dialog element using `.close()`.
 * Uses requestAnimationFrame to ensure the DOM is updated before attempting to close.
 * Fails with `ElementNotFound` if the selector does not match an `HTMLDialogElement`.
 *
 * @example
 * ```typescript
 * Task.closeModal('#my-dialog').pipe(Effect.ignore, Effect.as(NoOp()))
 * ```
 */
export const closeModal = (
  selector: string,
): Effect.Effect<void, ElementNotFound> =>
  Effect.async<void, ElementNotFound>(resume => {
    requestAnimationFrame(() => {
      const element = document.querySelector(selector)
      if (element instanceof HTMLDialogElement) {
        element.close()
        resume(Effect.void)
      } else {
        resume(Effect.fail(new ElementNotFound({ selector })))
      }
    })
  })

/**
 * Programmatically clicks an element matching the given selector.
 * Uses requestAnimationFrame to ensure the DOM is updated before attempting to click.
 * Fails with `ElementNotFound` if the selector does not match an `HTMLElement`.
 *
 * @example
 * ```typescript
 * Task.clickElement('#menu-item-2').pipe(Effect.ignore, Effect.as(NoOp()))
 * ```
 */
export const clickElement = (
  selector: string,
): Effect.Effect<void, ElementNotFound> =>
  Effect.async<void, ElementNotFound>(resume => {
    requestAnimationFrame(() => {
      const element = document.querySelector(selector)
      if (element instanceof HTMLElement) {
        element.click()
        resume(Effect.void)
      } else {
        resume(Effect.fail(new ElementNotFound({ selector })))
      }
    })
  })

/**
 * Scrolls an element into view by selector using `{ block: 'nearest' }`.
 * Uses requestAnimationFrame to ensure the DOM is updated before attempting to scroll.
 * Fails with `ElementNotFound` if the selector does not match an `HTMLElement`.
 *
 * @example
 * ```typescript
 * Task.scrollIntoView('#active-item').pipe(Effect.ignore, Effect.as(NoOp()))
 * ```
 */
export const scrollIntoView = (
  selector: string,
): Effect.Effect<void, ElementNotFound> =>
  Effect.async<void, ElementNotFound>(resume => {
    requestAnimationFrame(() => {
      const element = document.querySelector(selector)
      if (element instanceof HTMLElement) {
        element.scrollIntoView({ block: 'nearest' })
        resume(Effect.void)
      } else {
        resume(Effect.fail(new ElementNotFound({ selector })))
      }
    })
  })
