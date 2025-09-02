import { Array, Data, Effect, flow, pipe, Record, Schema, String } from 'effect'
import { Url } from './runtime'

export class ParseError extends Data.TaggedError('ParseError')<{
  readonly message: string
  readonly expected?: string
  readonly actual?: string
  readonly position?: number
}> {}

export type ParseResult<A> = [A, string[]]
export type Parser<A> = (
  segments: string[],
  search?: string,
) => Effect.Effect<ParseResult<A>, ParseError>

export type TerminalParser<A> = Parser<A> & { readonly __terminal: true }

/* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
const makeTerminalParser = <A>(parser: Parser<A>): TerminalParser<A> => parser as TerminalParser<A>

export const s =
  (segment: string): Parser<{}> =>
  (segments) =>
    Array.matchLeft(segments, {
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

export const param =
  <A>(label: string, parse: (segment: string) => Effect.Effect<A, ParseError>): Parser<A> =>
  (segments) =>
    Array.matchLeft(segments, {
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

export const string = <K extends string>(name: K): Parser<Record<K, string>> =>
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  param(`string (${name})`, (segment) => Effect.succeed({ [name]: segment } as Record<K, string>))

export const int = <K extends string>(name: K): Parser<Record<K, number>> =>
  param(`integer (${name})`, (segment) => {
    const parsed = parseInt(segment, 10)

    return isNaN(parsed) || parsed.toString() !== segment
      ? Effect.fail(
          new ParseError({
            message: `Expected integer for ${name}`,
            expected: 'integer',
            actual: segment,
          }),
        )
      : /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
        Effect.succeed({ [name]: parsed } as Record<K, number>)
  })

export const root: Parser<{}> = (segments) =>
  Array.matchLeft(segments, {
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
  <A>(parsers: (Parser<A> | TerminalParser<A>)[]): Parser<A> =>
  (segments, search) =>
    Array.matchLeft(parsers, {
      onEmpty: () => {
        const segmentsStr = '/' + Array.join(segments, '/')

        return Effect.fail(
          new ParseError({
            message: `No parsers provided for path: ${segmentsStr}`,
          }),
        )
      },
      onNonEmpty: () =>
        Effect.firstSuccessOf(Array.map(parsers, (parser) => parser(segments, search))),
    })

export const map =
  <A, B>(f: (a: A) => B) =>
  (parser: Parser<A>): Parser<B> =>
  (segments, search) =>
    pipe(
      parser(segments, search),
      Effect.map(([value, remaining]) => [f(value), remaining]),
    )

export const slash =
  <A extends Record<string, unknown>>(parserB: Parser<A>) =>
  <B extends Record<string, unknown>>(
    parserA: Parser<B> & {
      readonly __terminal?: never
      readonly 'Cannot use slash after query - query parameters must be terminal'?: never
    },
  ): Parser<B & A> =>
  (segments, search) =>
    pipe(
      parserA(segments, search),
      Effect.flatMap(([valueA, remainingA]) =>
        pipe(
          parserB(remainingA, search),
          Effect.map(([valueB, remainingB]) => [{ ...valueA, ...valueB }, remainingB]),
        ),
      ),
    )

export const query =
  <A, I>(schema: Schema.Schema<A, I>) =>
  <B extends Record<string, unknown>>(parser: Parser<B>): TerminalParser<B & A> => {
    const queryParser = (segments: string[], search?: string) => {
      return pipe(
        parser(segments, search),
        Effect.flatMap(([pathValue, remainingSegments]) => {
          const searchParams = new URLSearchParams(search ?? '')
          const queryRecord = Record.fromEntries(searchParams.entries())

          return pipe(
            queryRecord,
            Schema.decodeUnknown(schema),
            Effect.mapError(
              (error) =>
                new ParseError({
                  message: `Query parameter validation failed: ${error.message}`,
                  expected: 'valid query parameters',
                  actual: search || 'empty',
                }),
            ),
            Effect.map(
              (queryValue) =>
                /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
                [{ ...pathValue, ...queryValue }, remainingSegments] as [B & A, string[]],
            ),
          )
        }),
      )
    }
    return makeTerminalParser(queryParser)
  }

const pathToSegments = flow(String.split('/'), Array.filter(String.isNonEmpty))

export const parseUrlString = (urlString: string): Url => {
  const [pathAndQuery, hash] = String.split(urlString, '#')
  const [pathname, search] = String.split(pathAndQuery, '?')

  return {
    pathname,
    search: search ?? '',
    hash: hash ?? '',
  }
}

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

export const parseUrl =
  <A>(parser: Parser<A> | TerminalParser<A>) =>
  (url: Url) => {
    return pipe(
      pathToSegments(url.pathname),
      (segments) => parser(segments, url.search),
      Effect.flatMap(complete),
    )
  }

export type UrlRequest = Data.TaggedEnum<{
  Internal: { url: Url }
  External: { href: string }
}>

export const UrlRequest = Data.taggedEnum<UrlRequest>()

export const fromLocation = (location: Location): UrlRequest =>
  UrlRequest.Internal({
    url: {
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
    },
  })
