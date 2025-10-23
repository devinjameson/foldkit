import { Array, Data, Effect, Option, Predicate, Record, Schema, String, flow, pipe } from 'effect'

import { Url } from './url'

export class ParseError extends Data.TaggedError('ParseError')<{
  readonly message: string
  readonly expected?: string
  readonly actual?: string
  readonly position?: number
}> {}

type ParseResult<A> = [A, string[]]

type PrintState = {
  segments: string[]
  queryParams: URLSearchParams
}

type Biparser<A> = {
  parse: (segments: string[], search?: string) => Effect.Effect<ParseResult<A>, ParseError>
  print: (value: A, state: PrintState) => Effect.Effect<PrintState, ParseError>
}

export type Router<A> = {
  parse: (segments: string[], search?: string) => Effect.Effect<ParseResult<A>, ParseError>
  build: (value: A extends { _tag: string } ? Omit<A, '_tag'> : never) => string
}

export type TerminalParser<A> = Biparser<A> & { readonly __terminal: true }

const makeTerminalParser = <A>(parser: Biparser<A>): TerminalParser<A> =>
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  parser as TerminalParser<A>

export const literal = (segment: string): Biparser<{}> => ({
  parse: (segments) =>
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
    }),
  print: (_, state) =>
    Effect.succeed({
      ...state,
      segments: [...state.segments, segment],
    }),
})

export const param = <A>(
  label: string,
  parse: (segment: string) => Effect.Effect<A, ParseError>,
  print: (value: A) => string,
): Biparser<A> => ({
  parse: (segments) =>
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
    }),
  print: (value, state) =>
    Effect.succeed({
      ...state,
      segments: [...state.segments, print(value)],
    }),
})

export const string = <K extends string>(name: K): Biparser<Record<K, string>> =>
  param(
    `string (${name})`,
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    (segment) => Effect.succeed({ [name]: segment } as Record<K, string>),
    (record) => record[name],
  )

export const int = <K extends string>(name: K): Biparser<Record<K, number>> =>
  param(
    `integer (${name})`,
    (segment) => {
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
    },
    (record) => record[name].toString(),
  )

export const root: Biparser<{}> = {
  parse: (segments) =>
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
    }),
  print: (_, state) => Effect.succeed(state),
}

export type Parser<A> = {
  parse: (segments: string[], search?: string) => Effect.Effect<ParseResult<A>, ParseError>
}

// Overloaded signatures for oneOf to properly infer union types
export function oneOf<A>(p1: Biparser<A> | Parser<A>): Parser<A>
export function oneOf<A, B = never>(
  p1: Biparser<A> | Parser<A>,
  p2: Biparser<B> | Parser<B>,
): Parser<A | B>
export function oneOf<A, B = never, C = never>(
  p1: Biparser<A> | Parser<A>,
  p2: Biparser<B> | Parser<B>,
  p3: Biparser<C> | Parser<C>,
): Parser<A | B | C>
export function oneOf<A, B = never, C = never, D = never>(
  p1: Biparser<A> | Parser<A>,
  p2: Biparser<B> | Parser<B>,
  p3: Biparser<C> | Parser<C>,
  p4: Biparser<D> | Parser<D>,
): Parser<A | B | C | D>
export function oneOf<A, B = never, C = never, D = never, E = never>(
  p1: Biparser<A> | Parser<A>,
  p2: Biparser<B> | Parser<B>,
  p3: Biparser<C> | Parser<C>,
  p4: Biparser<D> | Parser<D>,
  p5: Biparser<E> | Parser<E>,
): Parser<A | B | C | D | E>
export function oneOf<A, B = never, C = never, D = never, E = never, F = never>(
  p1: Biparser<A> | Parser<A>,
  p2: Biparser<B> | Parser<B>,
  p3: Biparser<C> | Parser<C>,
  p4: Biparser<D> | Parser<D>,
  p5: Biparser<E> | Parser<E>,
  p6: Biparser<F> | Parser<F>,
): Parser<A | B | C | D | E | F>
export function oneOf<A, B = never, C = never, D = never, E = never, F = never, G = never>(
  p1: Biparser<A> | Parser<A>,
  p2: Biparser<B> | Parser<B>,
  p3: Biparser<C> | Parser<C>,
  p4: Biparser<D> | Parser<D>,
  p5: Biparser<E> | Parser<E>,
  p6: Biparser<F> | Parser<F>,
  p7: Biparser<G> | Parser<G>,
): Parser<A | B | C | D | E | F | G>
export function oneOf<
  A,
  B = never,
  C = never,
  D = never,
  E = never,
  F = never,
  G = never,
  H = never,
>(
  p1: Biparser<A> | Parser<A>,
  p2: Biparser<B> | Parser<B>,
  p3: Biparser<C> | Parser<C>,
  p4: Biparser<D> | Parser<D>,
  p5: Biparser<E> | Parser<E>,
  p6: Biparser<F> | Parser<F>,
  p7: Biparser<G> | Parser<G>,
  p8: Biparser<H> | Parser<H>,
): Parser<A | B | C | D | E | F | G | H>
export function oneOf<
  A,
  B = never,
  C = never,
  D = never,
  E = never,
  F = never,
  G = never,
  H = never,
  I = never,
>(
  p1: Biparser<A> | Parser<A>,
  p2: Biparser<B> | Parser<B>,
  p3: Biparser<C> | Parser<C>,
  p4: Biparser<D> | Parser<D>,
  p5: Biparser<E> | Parser<E>,
  p6: Biparser<F> | Parser<F>,
  p7: Biparser<G> | Parser<G>,
  p8: Biparser<H> | Parser<H>,
  p9: Biparser<I> | Parser<I>,
): Parser<A | B | C | D | E | F | G | H | I>
export function oneOf<
  A,
  B = never,
  C = never,
  D = never,
  E = never,
  F = never,
  G = never,
  H = never,
  I = never,
  J = never,
>(
  p1: Biparser<A> | Parser<A>,
  p2: Biparser<B> | Parser<B>,
  p3: Biparser<C> | Parser<C>,
  p4: Biparser<D> | Parser<D>,
  p5: Biparser<E> | Parser<E>,
  p6: Biparser<F> | Parser<F>,
  p7: Biparser<G> | Parser<G>,
  p8: Biparser<H> | Parser<H>,
  p9: Biparser<I> | Parser<I>,
  p10: Biparser<J> | Parser<J>,
): Parser<A | B | C | D | E | F | G | H | I | J>
export function oneOf(
  p1: Biparser<any> | Parser<any>,
  p2?: Biparser<any> | Parser<any>,
  p3?: Biparser<any> | Parser<any>,
  p4?: Biparser<any> | Parser<any>,
  p5?: Biparser<any> | Parser<any>,
  p6?: Biparser<any> | Parser<any>,
  p7?: Biparser<any> | Parser<any>,
  p8?: Biparser<any> | Parser<any>,
  p9?: Biparser<any> | Parser<any>,
  p10?: Biparser<any> | Parser<any>,
): Parser<any> {
  const parsers = [p1, p2, p3, p4, p5, p6, p7, p8, p9, p10].filter((p) => p !== undefined)

  return {
    parse: (segments, search) =>
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
          Effect.firstSuccessOf(Array.map(parsers, (parser) => parser.parse(segments, search))),
      }),
  }
}

export const mapTo: {
  <T>(appRouteConstructor: { make: () => T }): (parser: Biparser<{}>) => Router<T>
  <A, T>(appRouteConstructor: { make: (data: A) => T }): (parser: Biparser<A>) => Router<T>
} = (appRouteConstructor: any): any => {
  return (parser: any) => {
    return {
      parse: (segments: string[], search?: string) =>
        pipe(
          parser.parse(segments, search),
          Effect.map(([value, remaining]: any) => {
            const result =
              appRouteConstructor.make.length === 0
                ? appRouteConstructor.make()
                : appRouteConstructor.make(value)
            return [result, remaining]
          }),
        ),
      build: buildUrl(parser),
    }
  }
}

export const slash =
  <A extends Record<string, unknown>, B extends Record<string, unknown>>(parserB: Biparser<A>) =>
  (
    parserA: Biparser<B> & {
      readonly __terminal?: never
      readonly 'Cannot use slash after query - query parameters must be terminal'?: never
    },
  ): Biparser<B & A> => ({
    parse: (segments, search) =>
      pipe(
        parserA.parse(segments, search),
        Effect.flatMap(([valueA, remainingA]) =>
          pipe(
            parserB.parse(remainingA, search),
            Effect.map(([valueB, remainingB]) => [{ ...valueA, ...valueB }, remainingB]),
          ),
        ),
      ),
    print: (value, state) =>
      pipe(
        parserA.print(value, state),
        Effect.flatMap((newState) => parserB.print(value, newState)),
      ),
  })

export const query =
  <A, I extends Record.ReadonlyRecord<string, unknown>>(schema: Schema.Schema<A, I>) =>
  <B extends Record<string, unknown>>(parser: Biparser<B>): TerminalParser<B & A> => {
    const queryParser: Biparser<B & A> = {
      parse: (segments, search) => {
        return pipe(
          parser.parse(segments, search),
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
      },
      print: (value, state) =>
        pipe(
          parser.print(value, state),
          Effect.flatMap((newState) => {
            return pipe(
              Schema.encode(schema)(value),
              Effect.map((queryValue) => {
                const newQueryParams = new URLSearchParams(newState.queryParams)
                pipe(
                  queryValue,
                  Record.toEntries,
                  Array.forEach(([key, val]) => {
                    if (Predicate.isNotNullable(val)) {
                      newQueryParams.set(key, val.toString())
                    }
                  }),
                )
                return {
                  ...newState,
                  queryParams: newQueryParams,
                }
              }),
              Effect.mapError(
                (error) =>
                  new ParseError({
                    message: `Query parameter encoding failed: ${error.message}`,
                  }),
              ),
            )
          }),
        ),
    }
    return makeTerminalParser(queryParser)
  }

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

const parseUrl =
  <A>(parser: Biparser<A> | TerminalParser<A> | Parser<A>) =>
  (url: Url) => {
    return pipe(
      pathToSegments(url.pathname),
      (segments) => parser.parse(segments, Option.getOrUndefined(url.search)),
      Effect.flatMap(complete),
    )
  }

export const parseUrlWithFallback =
  <A, B>(parser: Parser<A>, notFoundRouteConstructor: { make: (data: { path: string }) => B }) =>
  (url: Url): A | B =>
    pipe(
      url,
      parseUrl(parser),
      Effect.orElse(() => Effect.succeed(notFoundRouteConstructor.make({ path: url.pathname }))),
      Effect.runSync,
    )

export type UrlRequest = Data.TaggedEnum<{
  Internal: { url: Url }
  External: { href: string }
}>

export const UrlRequest = Data.taggedEnum<UrlRequest>()

const buildUrl =
  <A>(parser: Biparser<A>) =>
  (data: A): string => {
    const initialState: PrintState = {
      segments: [],
      queryParams: new URLSearchParams(),
    }

    return pipe(
      parser.print(data, initialState),
      Effect.map((state) => {
        const path = '/' + Array.join(state.segments, '/')
        const query = state.queryParams.toString()
        return query ? `${path}?${query}` : path
      }),
      Effect.runSync,
    )
  }
