import { Schema as S } from 'effect'
import { describe, expect, expectTypeOf, it } from 'vitest'

import { defineRouteUnion, defineTaggedUnion } from './index.js'
import type { NoFields } from './index.js'

const Submission = defineTaggedUnion({
  NotSubmitted: {},
  Submitting: {},
  Failed: { error: S.String },
})
type Submission = typeof Submission.Type

const AppRoute = defineRouteUnion({
  Home: {},
  Person: { personId: S.Number },
  NotFound: { path: S.String },
})

describe('defineTaggedUnion', () => {
  it('builds a callable constructor for a variant with no fields', () => {
    expect(Submission.NotSubmitted()).toStrictEqual({ _tag: 'NotSubmitted' })
  })

  it('builds a callable constructor for a variant with fields', () => {
    expect(Submission.Failed({ error: 'timeout' })).toStrictEqual({
      _tag: 'Failed',
      error: 'timeout',
    })
  })

  it('decodes a member of the union', () => {
    expect(
      S.decodeUnknownSync(Submission)({ _tag: 'Failed', error: 'timeout' }),
    ).toStrictEqual({ _tag: 'Failed', error: 'timeout' })
  })

  it('rejects a tag the union does not declare', () => {
    expect(() => S.decodeUnknownSync(Submission)({ _tag: 'Unknown' })).toThrow()
  })

  it('works with exhaustive tag matching', () => {
    const describeSubmission = (submission: Submission) =>
      Submission.match<string>(submission, {
        NotSubmitted: () => 'not submitted',
        Submitting: () => 'submitting',
        Failed: ({ error }) => `failed: ${error}`,
      })

    expect(describeSubmission(Submission.Submitting())).toBe('submitting')
    expect(describeSubmission(Submission.Failed({ error: 'timeout' }))).toBe(
      'failed: timeout',
    )
  })

  it('narrows a value with isAnyOf', () => {
    const isSettled = Submission.isAnyOf(['NotSubmitted', 'Failed'])

    expect(isSettled(Submission.Failed({ error: 'timeout' }))).toBe(true)
    expect(isSettled(Submission.Submitting())).toBe(false)
  })

  it('exposes the member schemas that Machine.define enumerates', () => {
    expect(Submission.members).toStrictEqual([
      Submission.NotSubmitted,
      Submission.Submitting,
      Submission.Failed,
    ])
    expectTypeOf(Submission.members).toEqualTypeOf<
      ReadonlyArray<
        | typeof Submission.NotSubmitted
        | typeof Submission.Submitting
        | typeof Submission.Failed
      >
    >()
  })

  it('narrows a value with a per-variant guard', () => {
    expect(Submission.guards.Submitting(Submission.Submitting())).toBe(true)
    expect(Submission.guards.Submitting(Submission.NotSubmitted())).toBe(false)
  })
})

describe('subsets', () => {
  const Settled = Submission.subset(['NotSubmitted', 'Failed'])

  it('builds a Schema from only the named variants', () => {
    expect(
      S.decodeUnknownSync(Settled)({ _tag: 'Failed', error: 'timeout' }),
    ).toStrictEqual({ _tag: 'Failed', error: 'timeout' })
    expect(() => S.decodeUnknownSync(Settled)({ _tag: 'Submitting' })).toThrow()

    expect(Settled.members).toStrictEqual([
      Submission.NotSubmitted,
      Submission.Failed,
    ])
    expectTypeOf(Settled.Type).toEqualTypeOf<
      typeof Submission.NotSubmitted.Type | typeof Submission.Failed.Type
    >()
  })

  it('rejects unknown and inherited variant names at runtime', () => {
    for (const tag of ['Unknown', 'toString']) {
      expect(() =>
        Reflect.apply(Submission.subset, undefined, [[tag]]),
      ).toThrow(`Union subset contains an unknown variant: ${tag}`)
    }
  })

  if (false) {
    // @ts-expect-error A subset can contain only variants from its union
    Submission.subset(['Unknown'])
  }
})

describe('NoFields', () => {
  const acceptsNoFields = <Tag extends string>(_variant: NoFields<Tag>) => true

  it('accepts a no-field variant from any union kind', () => {
    expect(acceptsNoFields(Submission.NotSubmitted)).toBe(true)
    expect(acceptsNoFields(AppRoute.Home)).toBe(true)
  })

  it('rejects a variant that carries fields', () => {
    // @ts-expect-error Failed carries an error field
    acceptsNoFields(Submission.Failed)
    // @ts-expect-error Person carries a personId field
    acceptsNoFields(AppRoute.Person)
  })
})

describe('defineRouteUnion', () => {
  it('builds route values that decode as members of the union', () => {
    const person = AppRoute.Person({ personId: 42 })

    expect(person).toStrictEqual({ _tag: 'Person', personId: 42 })
    expect(S.is(AppRoute)(person)).toBe(true)
  })

  it('exposes each variant as a schema in its own right', () => {
    expect(
      S.decodeUnknownSync(AppRoute.NotFound)({
        _tag: 'NotFound',
        path: '/missing',
      }),
    ).toStrictEqual({ _tag: 'NotFound', path: '/missing' })
  })

  it('derives a Route subset Schema', () => {
    const PublicRoute = AppRoute.subset(['Home', 'NotFound'])

    expect(S.is(PublicRoute)(AppRoute.Home())).toBe(true)
    expect(S.is(PublicRoute)(AppRoute.Person({ personId: 42 }))).toBe(false)
    expectTypeOf(PublicRoute.Type).toEqualTypeOf<
      typeof AppRoute.Home.Type | typeof AppRoute.NotFound.Type
    >()
  })

  it('rejects a variant name that shadows the union surface', () => {
    expect(() =>
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      defineRouteUnion({ members: {}, subset: {} } as never),
    ).toThrow('Route variant names conflict with union properties')
  })

  if (false) {
    // @ts-expect-error Domain variant names cannot shadow the member list
    defineTaggedUnion({ members: {} })
    // @ts-expect-error Route variant names cannot shadow the member list
    defineRouteUnion({ members: {} })
    // @ts-expect-error Domain variant names cannot shadow the subset builder
    defineTaggedUnion({ subset: {} })
    // @ts-expect-error Route variant names cannot shadow the subset builder
    defineRouteUnion({ subset: {} })
  }
})
