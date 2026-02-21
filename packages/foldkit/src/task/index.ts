import {
  Array,
  DateTime,
  Duration,
  Effect,
  Number,
  Option,
  Predicate,
  pipe,
} from 'effect'

/**
 * Creates a command that gets the current UTC time and passes it to a message constructor.
 * This is similar to Elm's `Task.perform` with `Time.now`.
 *
 * @example
 * ```typescript
 * Task.getTime(utc => GotTime({ utc }))
 * ```
 */
export const getTime = <Message>(
  f: (utc: DateTime.Utc) => Message,
): Effect.Effect<Message> => Effect.map(DateTime.now, f)

/**
 * Creates a command that gets the system timezone and passes it to a message constructor.
 * This is similar to Elm's `Task.perform` with `Time.here`.
 *
 * @example
 * ```typescript
 * Task.getTimeZone(zone => GotTimeZone({ zone }))
 * ```
 */
export const getTimeZone = <Message>(
  f: (zone: DateTime.TimeZone) => Message,
): Effect.Effect<Message> => Effect.sync(() => f(DateTime.zoneMakeLocal()))

/**
 * Creates a command that gets the current time in the system timezone and passes it to a message constructor.
 * This combines both time and timezone in a single task.
 *
 * @example
 * ```typescript
 * Task.getZonedTime(zoned => GotTime({ zoned }))
 * ```
 */
export const getZonedTime = <Message>(
  f: (zoned: DateTime.Zoned) => Message,
): Effect.Effect<Message> =>
  Effect.gen(function* () {
    const utc = yield* DateTime.now
    const zone = DateTime.zoneMakeLocal()
    const zoned = DateTime.setZone(utc, zone)
    return f(zoned)
  })

/**
 * Creates a command that gets the current time in a specific timezone and passes it to a message constructor.
 * If the timezone is invalid, the effect will fail with an error string.
 *
 * @example
 * ```typescript
 * Task.getZonedTimeIn('America/New_York', zoned => GotNYTime({ zoned }))
 * ```
 */
export const getZonedTimeIn = <Message>(
  zoneId: string,
  f: (zoned: DateTime.Zoned) => Message,
): Effect.Effect<Message, string> =>
  Effect.gen(function* () {
    const utc = yield* DateTime.now
    const maybeZone = DateTime.zoneMakeNamed(zoneId)
    if (Option.isNone(maybeZone)) {
      return yield* Effect.fail(`Invalid timezone: ${zoneId}`)
    }
    const zoned = DateTime.setZone(utc, maybeZone.value)
    return f(zoned)
  })

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
 * Creates a command that generates a random integer between min (inclusive) and max (exclusive)
 * and passes it to a message constructor.
 *
 * @example
 * ```typescript
 * Task.randomInt(0, 100, value => GotRandom({ value }))
 * ```
 */
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

export const randomInt = <Message>(
  min: number,
  max: number,
  f: (value: number) => Message,
): Effect.Effect<Message> =>
  Effect.sync(() => f(Math.floor(Math.random() * (max - min)) + min))

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

const inertState = {
  originals: new Map<
    HTMLElement,
    { ariaHidden: string | null; inert: boolean }
  >(),
  counts: new Map<HTMLElement, number>(),
  cleanups: new Map<string, ReadonlyArray<() => void>>(),
}

const markInert = (element: HTMLElement): (() => void) => {
  const count = inertState.counts.get(element) ?? 0
  inertState.counts.set(element, Number.increment(count))

  if (count === 0) {
    inertState.originals.set(element, {
      ariaHidden: element.getAttribute('aria-hidden'),
      inert: element.inert,
    })

    element.setAttribute('aria-hidden', 'true')
    element.inert = true
  }

  return () => markNotInert(element)
}

const markNotInert = (element: HTMLElement): void => {
  const count = inertState.counts.get(element) ?? 1

  if (count === 1) {
    const original = inertState.originals.get(element)

    if (original) {
      if (Predicate.isNull(original.ariaHidden)) {
        element.removeAttribute('aria-hidden')
      } else {
        element.setAttribute('aria-hidden', original.ariaHidden)
      }

      element.inert = original.inert
      inertState.originals.delete(element)
    }

    inertState.counts.delete(element)
  } else {
    inertState.counts.set(element, Number.decrement(count))
  }
}

const resolveElements = (
  selectors: ReadonlyArray<string>,
): ReadonlyArray<HTMLElement> =>
  Array.filterMap(selectors, (selector) => {
    const element = document.querySelector(selector)
    return element instanceof HTMLElement ? Option.some(element) : Option.none()
  })

const ancestorsUpToBody = (element: HTMLElement): ReadonlyArray<HTMLElement> =>
  Array.unfold(element.parentElement, (current) =>
    Predicate.isNotNull(current)
      ? Option.some([
          current,
          current === document.body ? null : current.parentElement,
        ])
      : Option.none(),
  )

const inertableSiblings = (
  parent: HTMLElement,
  allowedElements: ReadonlyArray<HTMLElement>,
): ReadonlyArray<HTMLElement> =>
  pipe(
    parent.children,
    Array.fromIterable,
    Array.filterMap((child) =>
      child instanceof HTMLElement &&
      !Array.some(allowedElements, (allowed) => child.contains(allowed))
        ? Option.some(child)
        : Option.none(),
    ),
  )

/**
 * Creates a command that marks all DOM elements outside the given selectors as
 * `inert` and `aria-hidden="true"`. Walks each allowed element up to
 * `document.body`, marking siblings that don't contain an allowed element.
 * Uses reference counting so nested calls are safe.
 *
 * @example
 * ```typescript
 * Task.inertOthers('my-menu', ['#menu-button', '#menu-items'], () => NoOp())
 * ```
 */
export const inertOthers = <Message>(
  id: string,
  allowedSelectors: ReadonlyArray<string>,
  f: () => Message,
): Effect.Effect<Message> =>
  Effect.sync(() => {
    const allowedElements = resolveElements(allowedSelectors)

    const cleanupFunctions = pipe(
      allowedElements,
      Array.flatMap(ancestorsUpToBody),
      Array.flatMap((ancestor) =>
        Array.map(inertableSiblings(ancestor, allowedElements), markInert),
      ),
    )

    inertState.cleanups.set(id, cleanupFunctions)

    return f()
  })

/**
 * Creates a command that restores all elements previously marked inert by
 * `inertOthers` for the given ID. Safe to call without a preceding
 * `inertOthers` — acts as a no-op in that case.
 *
 * @example
 * ```typescript
 * Task.restoreInert('my-menu', () => NoOp())
 * ```
 */
export const restoreInert = <Message>(
  id: string,
  f: () => Message,
): Effect.Effect<Message> =>
  Effect.sync(() => {
    const cleanupFunctions = inertState.cleanups.get(id)

    if (cleanupFunctions) {
      Array.forEach(cleanupFunctions, (cleanup) => cleanup())
      inertState.cleanups.delete(id)
    }

    return f()
  })
