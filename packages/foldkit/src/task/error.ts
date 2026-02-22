import { Data } from 'effect'

/** Error indicating that a DOM element matching the given selector was not found. */
export class ElementNotFound extends Data.TaggedError('ElementNotFound')<{
  readonly selector: string
}> {}

/** Error indicating that the given timezone ID is invalid. */
export class TimeZoneError extends Data.TaggedError('TimeZoneError')<{
  readonly zoneId: string
}> {}
