import { Effect } from 'effect'

export const pushUrl = (url: string): Effect.Effect<void> =>
  Effect.sync(() => {
    window.history.pushState({}, '', url)
    window.dispatchEvent(new CustomEvent('foldkit:urlchange'))
  })

export const replaceUrl = (url: string): Effect.Effect<void> =>
  Effect.sync(() => {
    window.history.replaceState({}, '', url)
    window.dispatchEvent(new CustomEvent('foldkit:urlchange'))
  })

export const back = (): Effect.Effect<void> =>
  Effect.sync(() => window.history.back())

export const forward = (): Effect.Effect<void> =>
  Effect.sync(() => window.history.forward())

export const load = (href: string): Effect.Effect<void> =>
  Effect.sync(() => window.location.assign(href))
