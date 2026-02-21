import { DateTime, Effect, Option } from 'effect'

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
