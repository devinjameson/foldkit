import { DateTime, Effect, Option } from 'effect'

/**
 * Creates a command that gets the current UTC time and passes it to a message constructor.
 * This is similar to Elm's `Task.perform` with `Time.now`.
 *
 * @example
 * ```typescript
 * Task.getTime(utc => GotTime.make({ utc }))
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
 * Task.getTimeZone(zone => GotTimeZone.make({ zone }))
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
 * Task.getZonedTime(zoned => GotTime.make({ zoned }))
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
 * Task.getZonedTimeIn('America/New_York', zoned => GotNYTime.make({ zoned }))
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
 * Returns true if the element was found and focused, false otherwise.
 * Uses requestAnimationFrame to ensure the DOM tree is updated and nodes exist before attempting to focus.
 * This follows the same approach as Elm's Browser.Dom.focus.
 *
 * @example
 * ```typescript
 * Task.focus('#email-input', success => InputFocused.make({ success }))
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
 * Creates a command that generates a random integer between min (inclusive) and max (exclusive)
 * and passes it to a message constructor.
 *
 * @example
 * ```typescript
 * Task.randomInt(0, 100, value => GotRandom.make({ value }))
 * ```
 */
export const randomInt = <Message>(
  min: number,
  max: number,
  f: (value: number) => Message,
): Effect.Effect<Message> =>
  Effect.sync(() => f(Math.floor(Math.random() * (max - min)) + min))
