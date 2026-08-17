import { Effect, Option, Schema as S } from 'effect'
import { describe, expect, expectTypeOf, it } from 'vitest'

import {
  type ServiceOf,
  type ServicesOf,
  aggregate,
  lift,
  make,
  tag,
} from './managedResource.js'

// A child Submodel owns a session resource and mounts/unmounts.

type ChildModel = Readonly<{ maybeToken: Option.Option<string> }>

type ChildMessage = Readonly<{
  tag: 'AcquiredSession' | 'ReleasedSession' | 'FailedSession'
}>

const childMessage = (tag: ChildMessage['tag']): ChildMessage => ({ tag })

const SessionResource = tag<Readonly<{ token: string }>>()('SessionResource')

const sessionSchema = S.Option(S.Struct({ token: S.String }))

const childManagedResources = make<ChildModel, ChildMessage>()(entry => ({
  session: entry(sessionSchema, {
    resource: SessionResource,
    modelToMaybeRequirements: model =>
      Option.map(model.maybeToken, token => ({ token })),
    acquire: ({ token }) => Effect.succeed({ token }),
    release: () => Effect.void,
    onAcquired: () => childMessage('AcquiredSession'),
    onReleased: () => childMessage('ReleasedSession'),
    onAcquireError: () => childMessage('FailedSession'),
  }),
}))

// A parent embeds the child as an Option and holds its own local resource.

type ParentModel = Readonly<{ maybeChild: Option.Option<ChildModel> }>

type ParentMessage =
  | Readonly<{ tag: 'GotChild'; message: ChildMessage }>
  | Readonly<{ tag: 'Pinged' }>

const gotChild = (message: ChildMessage): ParentMessage => ({
  tag: 'GotChild',
  message,
})

const pinged = (): ParentMessage => ({ tag: 'Pinged' })

const PingResource = tag<number>()('PingResource')

const parentLocalManagedResources = make<ParentModel, ParentMessage>()(
  entry => ({
    ping: entry(S.Option(S.Null), {
      resource: PingResource,
      modelToMaybeRequirements: () => Option.some(null),
      acquire: () => Effect.succeed(1),
      release: () => Effect.void,
      onAcquired: pinged,
      onReleased: pinged,
      onAcquireError: pinged,
    }),
  }),
)

const liftedManagedResources = lift(childManagedResources)<
  ParentModel,
  ParentMessage
>({
  toChildModel: model => model.maybeChild,
  toParentMessage: gotChild,
})

describe('make', () => {
  it('inlines the positional requirements schema on each entry', () => {
    expect(childManagedResources.session.schema).toBe(sessionSchema)
  })

  it('exposes the resource tag for service-union inference', () => {
    expect(childManagedResources.session.resource).toBe(SessionResource)
  })
})

describe('lift', () => {
  it('releases when the child is unmounted', () => {
    const maybeRequirements =
      liftedManagedResources.session.modelToMaybeRequirements({
        maybeChild: Option.none(),
      })

    expect(Option.isNone(maybeRequirements)).toBe(true)
  })

  it('acquires with the child requirements when the child is mounted', () => {
    const maybeRequirements =
      liftedManagedResources.session.modelToMaybeRequirements({
        maybeChild: Option.some({ maybeToken: Option.some('abc') }),
      })

    expect(Option.getOrNull(maybeRequirements)).toStrictEqual({ token: 'abc' })
  })

  it('releases when the mounted child reports no requirements', () => {
    const maybeRequirements =
      liftedManagedResources.session.modelToMaybeRequirements({
        maybeChild: Option.some({ maybeToken: Option.none() }),
      })

    expect(Option.isNone(maybeRequirements)).toBe(true)
  })

  it('wraps each result message through toParentMessage', () => {
    const { onAcquired, onReleased, onAcquireError } =
      liftedManagedResources.session

    expect(onAcquired()).toStrictEqual(
      gotChild(childMessage('AcquiredSession')),
    )
    expect(onReleased()).toStrictEqual(
      gotChild(childMessage('ReleasedSession')),
    )
    expect(onAcquireError(new Error('boom'))).toStrictEqual(
      gotChild(childMessage('FailedSession')),
    )
  })

  it('preserves the child requirements schema', () => {
    expect(liftedManagedResources.session.schema).toBe(sessionSchema)
  })
})

type StrangerModel = Readonly<{ unrelated: string }>

const StrangerResource = tag<string>()('StrangerResource')

// Differs from the parent records in Model alone, so a negative that fires on
// it is proving the Model check rather than the Message check.
const strangerManagedResources = make<StrangerModel, ParentMessage>()(
  entry => ({
    stranger: entry(S.Option(S.Null), {
      resource: StrangerResource,
      modelToMaybeRequirements: () => Option.some(null),
      acquire: () => Effect.succeed('value'),
      release: () => Effect.void,
      onAcquired: pinged,
      onReleased: pinged,
      onAcquireError: pinged,
    }),
  }),
)

describe('aggregate', () => {
  it('combines records into one keyed by resource name', () => {
    const combined = aggregate(
      liftedManagedResources,
      parentLocalManagedResources,
    )

    expect(Object.keys(combined).sort()).toStrictEqual(['ping', 'session'])
  })

  it('throws on a duplicate key across records', () => {
    expect(() =>
      aggregate(parentLocalManagedResources, parentLocalManagedResources),
    ).toThrow('duplicate key "ping"')
  })

  it('still throws on a duplicate key through the curried form', () => {
    expect(() =>
      aggregate<ParentModel, ParentMessage>()(
        parentLocalManagedResources,
        parentLocalManagedResources,
      ),
    ).toThrow('duplicate key "ping"')
  })

  // NOTE: `pnpm typecheck` is the assertion for the block below, not vitest.
  if (false) {
    const combined = aggregate(
      liftedManagedResources,
      parentLocalManagedResources,
    )

    expectTypeOf<keyof typeof combined>().toEqualTypeOf<'session' | 'ping'>()

    expectTypeOf<ServicesOf<typeof combined>>().toEqualTypeOf<
      ServiceOf<typeof SessionResource> | ServiceOf<typeof PingResource>
    >()

    expectTypeOf(
      combined.session.modelToMaybeRequirements,
    ).parameters.toEqualTypeOf<[ParentModel]>()

    expectTypeOf(
      combined.session.modelToMaybeRequirements,
    ).returns.toEqualTypeOf<Option.Option<Readonly<{ token: string }>>>()

    expectTypeOf(combined.ping.release).parameters.toEqualTypeOf<[number]>()

    expectTypeOf(
      combined.session.onReleased,
    ).returns.toEqualTypeOf<ParentMessage>()

    // The arity of each `onAcquired` handler survives, so the Scene steps
    // still only demand a value where the handler consumes one.
    expectTypeOf(combined.session.onAcquired).parameters.toEqualTypeOf<[]>()

    // An aggregate is itself a record, so aggregates compose.
    const nested = aggregate(combined, parentLocalManagedResources)

    expectTypeOf<keyof typeof nested>().toEqualTypeOf<'session' | 'ping'>()

    aggregate(
      parentLocalManagedResources,
      // @ts-expect-error strangerManagedResources is declared over another Model
      strangerManagedResources,
    )

    aggregate<ParentModel, ParentMessage>()(
      parentLocalManagedResources,
      // @ts-expect-error the curried form rejects it the same way
      strangerManagedResources,
    )
  }
})
