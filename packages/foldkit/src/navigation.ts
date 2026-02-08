import { Effect } from 'effect'

/** Pushes a new URL to browser history and triggers Foldkit's URL change handling. */
export const pushUrl = (url: string): Effect.Effect<void> =>
  Effect.sync(() => {
    window.history.pushState({}, '', url)
    window.dispatchEvent(new CustomEvent('foldkit:urlchange'))
  })

/** Replaces the current URL in browser history and triggers Foldkit's URL change handling. */
export const replaceUrl = (url: string): Effect.Effect<void> =>
  Effect.sync(() => {
    window.history.replaceState({}, '', url)
    window.dispatchEvent(new CustomEvent('foldkit:urlchange'))
  })

/** Navigates back in browser history. */
export const back = (): Effect.Effect<void> =>
  Effect.sync(() => window.history.back())

/** Navigates forward in browser history. */
export const forward = (): Effect.Effect<void> =>
  Effect.sync(() => window.history.forward())

/** Performs a full page navigation to the given href. */
export const load = (href: string): Effect.Effect<void> =>
  Effect.sync(() => window.location.assign(href))
