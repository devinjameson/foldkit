import { Array, Data, Effect, flow, Function, pipe, String } from 'effect'

export class ParseError extends Data.TaggedError('ParseError')<{
  readonly message: string
  readonly expected?: string
  readonly actual?: string
  readonly position?: number
}> {}

export type ParseResult<A> = [A, string[]]
export type Parser<A> = (segments: string[]) => Effect.Effect<ParseResult<A>, ParseError>

export const s = (segment: string): Parser<{}> =>
  Array.matchLeft({
    onEmpty: () =>
      Effect.fail(
        new ParseError({
          message: `Expected '${segment}'`,
          expected: segment,
          actual: 'end of path',
          position: 0,
        }),
      ),
    onNonEmpty: (head, tail) =>
      head === segment
        ? Effect.succeed([{}, tail])
        : Effect.fail(
            new ParseError({
              message: `Expected '${segment}'`,
              expected: segment,
              actual: head,
              position: 0,
            }),
          ),
  })

export const param = <A>(
  label: string,
  parse: (segment: string) => Effect.Effect<A, ParseError>,
): Parser<A> =>
  Array.matchLeft({
    onEmpty: () =>
      Effect.fail(
        new ParseError({
          message: `Expected ${label}`,
          expected: label,
          actual: 'end of path',
          position: 0,
        }),
      ),
    onNonEmpty: (head, tail) =>
      pipe(
        head,
        parse,
        Effect.map((value) => [value, tail]),
      ),
  })

export const string: Parser<string> = param('string', Effect.succeed)

export const int: Parser<number> = param('integer', (segment) => {
  const parsed = parseInt(segment, 10)

  return isNaN(parsed) || parsed.toString() !== segment
    ? Effect.fail(
        new ParseError({
          message: 'Expected integer',
          expected: 'integer',
          actual: segment,
        }),
      )
    : Effect.succeed(parsed)
})

export const root: Parser<{}> = Array.matchLeft({
  onEmpty: () => Effect.succeed([{}, []]),
  onNonEmpty: (_, tail) =>
    Effect.fail(
      new ParseError({
        message: 'Expected root path',
        expected: 'root path',
        actual: `${tail.length + 1} remaining segments`,
      }),
    ),
})

export const oneOf =
  <A>(parsers: Parser<A>[]): Parser<A> =>
  (segments) =>
    Array.matchLeft(parsers, {
      onEmpty: () => {
        const segmentsStr = '/' + Array.join(segments, '/')

        return Effect.fail(
          new ParseError({
            message: `No parsers provided for path: ${segmentsStr}`,
          }),
        )
      },
      onNonEmpty: () => Effect.firstSuccessOf(Array.map(parsers, Function.apply(segments))),
    })

export const map =
  <A, B>(f: (a: A) => B) =>
  (parser: Parser<A>): Parser<B> =>
    flow(
      parser,
      Effect.map(([value, remaining]) => [f(value), remaining]),
    )

export const slash =
  <A>(parserB: Parser<A>) =>
  <B>(parserA: Parser<B>): Parser<[B, A]> =>
  (segments) =>
    pipe(
      segments,
      parserA,
      Effect.flatMap(([valueA, remainingA]) =>
        pipe(
          remainingA,
          parserB,
          Effect.map(([valueB, remainingB]) => [[valueA, valueB], remainingB]),
        ),
      ),
    )

const pathToSegments = flow(String.split('/'), Array.filter(String.isNonEmpty))

const complete = <A>([value, remaining]: ParseResult<A>) =>
  Array.match<string, Effect.Effect<A, ParseError>>(remaining, {
    onEmpty: () => Effect.succeed(value),
    onNonEmpty: () => {
      const remainingSegments = Array.join(remaining, '/')

      return Effect.fail(
        new ParseError({
          message: `Unexpected remaining segments: ${remainingSegments}`,
          actual: remainingSegments,
        }),
      )
    },
  })

export const parseUrl = <A>(parser: Parser<A>) =>
  flow(pathToSegments, parser, Effect.flatMap(complete))

export type UrlRequest = Data.TaggedEnum<{
  Internal: { url: string }
  External: { href: string }
}>

export const UrlRequest = Data.taggedEnum<UrlRequest>()

export const fromLocation = (location: Location): UrlRequest =>
  UrlRequest.Internal({ url: location.pathname + location.search + location.hash })
