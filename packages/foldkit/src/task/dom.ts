import { Effect } from 'effect'

/**
 * Creates a command that focuses an element by selector and passes the result to a message constructor.
 * Passes true if the element was found and focused, false otherwise.
 * Uses requestAnimationFrame to ensure the DOM tree is updated and nodes exist before attempting to focus.
 * This follows the same approach as Elm's Browser.Dom.focus.
 *
 * @example
 * ```typescript
 * Task.focus('#email-input', success => InputFocused({ success }))
 * ```
 */
export const focus = <Message>(
  selector: string,
  f: (success: boolean) => Message,
): Effect.Effect<Message> =>
  Effect.async<Message>((resume) => {
    requestAnimationFrame(() => {
      const element = document.querySelector(selector)
      if (element instanceof HTMLElement) {
        element.focus()
        resume(Effect.succeed(f(true)))
      } else {
        resume(Effect.succeed(f(false)))
      }
    })
  })

/**
 * Creates a command that opens a dialog element as a modal using `showModal()`.
 * Passes true if the element was found and opened, false otherwise.
 * Uses requestAnimationFrame to ensure the DOM tree is updated and nodes exist before attempting to show.
 *
 * @example
 * ```typescript
 * Task.showModal('#my-dialog', success => ModalOpened({ success }))
 * ```
 */
export const showModal = <Message>(
  selector: string,
  f: (success: boolean) => Message,
): Effect.Effect<Message> =>
  Effect.async<Message>((resume) => {
    requestAnimationFrame(() => {
      const element = document.querySelector(selector)
      if (element instanceof HTMLDialogElement) {
        element.showModal()
        resume(Effect.succeed(f(true)))
      } else {
        resume(Effect.succeed(f(false)))
      }
    })
  })

/**
 * Creates a command that closes a dialog element using `.close()`.
 * Passes true if the element was found and closed, false otherwise.
 * Uses requestAnimationFrame to ensure the DOM tree is updated and nodes exist before attempting to close.
 *
 * @example
 * ```typescript
 * Task.closeModal('#my-dialog', success => ModalClosed({ success }))
 * ```
 */
export const closeModal = <Message>(
  selector: string,
  f: (success: boolean) => Message,
): Effect.Effect<Message> =>
  Effect.async<Message>((resume) => {
    requestAnimationFrame(() => {
      const element = document.querySelector(selector)
      if (element instanceof HTMLDialogElement) {
        element.close()
        resume(Effect.succeed(f(true)))
      } else {
        resume(Effect.succeed(f(false)))
      }
    })
  })

/**
 * Creates a command that scrolls an element into view by selector and passes the result to a message constructor.
 * Passes true if the element was found and scrolled, false otherwise.
 * Uses requestAnimationFrame to ensure the DOM tree is updated and nodes exist before attempting to scroll.
 * Uses `{ block: 'nearest' }` to avoid unnecessary scrolling when the element is already visible.
 *
 * @example
 * ```typescript
 * Task.scrollIntoView('#active-item', success => ItemScrolled({ success }))
 * ```
 */
export const scrollIntoView = <Message>(
  selector: string,
  f: (success: boolean) => Message,
): Effect.Effect<Message> =>
  Effect.async<Message>((resume) => {
    requestAnimationFrame(() => {
      const element = document.querySelector(selector)
      if (element instanceof HTMLElement) {
        element.scrollIntoView({ block: 'nearest' })
        resume(Effect.succeed(f(true)))
      } else {
        resume(Effect.succeed(f(false)))
      }
    })
  })
