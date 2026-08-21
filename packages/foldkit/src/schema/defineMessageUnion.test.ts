import { Match as M, Schema as S } from 'effect'
import { describe, expect, it } from 'vitest'

import { defineMessageUnion } from './index.js'

const Message = defineMessageUnion({
  ClickedReset: {},
  ChangedCount: { count: S.Number },
  SelectedItem: { id: S.String, label: S.String },
})
type Message = typeof Message.Type

describe('defineMessageUnion', () => {
  it('builds a callable constructor for a variant with no fields', () => {
    expect(Message.ClickedReset()).toStrictEqual({ _tag: 'ClickedReset' })
  })

  it('builds a callable constructor for a variant with fields', () => {
    expect(Message.ChangedCount({ count: 1 })).toStrictEqual({
      _tag: 'ChangedCount',
      count: 1,
    })
  })

  it('uses the fast callable path for directly copyable fields', () => {
    const input = { count: 'not a number' }

    expect(() =>
      Reflect.apply(Message.ChangedCount.make, undefined, [input]),
    ).toThrow('Schema validation failed')
    expect(
      Reflect.apply(Message.ChangedCount, undefined, [input]),
    ).toStrictEqual({
      _tag: 'ChangedCount',
      count: 'not a number',
    })
  })

  it('produces the same value as the equivalent TaggedStruct constructor', () => {
    expect(Message.SelectedItem({ id: 'a', label: 'Alpha' })).toStrictEqual(
      S.TaggedStruct('SelectedItem', {
        id: S.String,
        label: S.String,
      }).make({ id: 'a', label: 'Alpha' }),
    )
  })

  it('decodes a member of the union', () => {
    expect(
      S.decodeUnknownSync(Message)({ _tag: 'ChangedCount', count: 2 }),
    ).toStrictEqual({ _tag: 'ChangedCount', count: 2 })
  })

  it('rejects a tag the union does not declare', () => {
    expect(() => S.decodeUnknownSync(Message)({ _tag: 'Unknown' })).toThrow()
  })

  it('rejects a member whose field has the wrong type', () => {
    expect(() =>
      S.decodeUnknownSync(Message)({ _tag: 'ChangedCount', count: 'two' }),
    ).toThrow()
  })

  it('exposes each variant as a schema in its own right', () => {
    expect(
      S.decodeUnknownSync(Message.ChangedCount)({
        _tag: 'ChangedCount',
        count: 3,
      }),
    ).toStrictEqual({ _tag: 'ChangedCount', count: 3 })
  })

  it('works with exhaustive tag matching', () => {
    const describeMessage = (message: Message) =>
      Message.match<string>(message, {
        ClickedReset: () => 'reset',
        ChangedCount: ({ count }) => `count ${count}`,
        SelectedItem: ({ label }) => `selected ${label}`,
      })

    expect(describeMessage(Message.ClickedReset())).toBe('reset')
    expect(describeMessage(Message.ChangedCount({ count: 4 }))).toBe('count 4')
  })

  it('rejects names that conflict with the tagged union surface', () => {
    expect(() =>
      Reflect.apply(defineMessageUnion, undefined, [{ match: {} }]),
    ).toThrowError(
      'Message variant names conflict with Schema.TaggedUnion properties: match',
    )
  })

  it('rejects names inherited from the tagged union prototype', () => {
    expect(() =>
      Reflect.apply(defineMessageUnion, undefined, [{ toString: {} }]),
    ).toThrowError(
      'Message variant names conflict with Schema.TaggedUnion properties: toString',
    )
  })

  it('rejects type-only tagged union property names at runtime', () => {
    expect(() =>
      Reflect.apply(defineMessageUnion, undefined, [{ Type: {} }]),
    ).toThrowError(
      'Message variant names conflict with Schema.TaggedUnion properties: Type',
    )
  })

  if (false) {
    // @ts-expect-error TaggedUnion cases are not part of the Message API
    Message.cases
    // @ts-expect-error TaggedUnion guards are not part of the Message API
    Message.guards
    // @ts-expect-error TaggedUnion isAnyOf is not part of the Message API
    Message.isAnyOf
    // @ts-expect-error Message variant names cannot shadow tagged union properties
    defineMessageUnion({ match: {} })
    // @ts-expect-error The collision check follows additions to the tagged union surface
    defineMessageUnion({ annotateKey: {} })
    // @ts-expect-error Type-only tagged union properties are also reserved
    defineMessageUnion({ Type: {} })
  }

  it('works with a single handler across several tags', () => {
    const isInteraction = (message: Message): boolean =>
      M.value(message).pipe(
        M.tag('ClickedReset', 'SelectedItem', () => true),
        M.orElse(() => false),
      )

    expect(isInteraction(Message.ClickedReset())).toBe(true)
    expect(isInteraction(Message.SelectedItem({ id: 'a', label: 'A' }))).toBe(
      true,
    )
    expect(isInteraction(Message.ChangedCount({ count: 1 }))).toBe(false)
  })

  it('works with partial tag matching and a fallback', () => {
    const describeMessage = (message: Message): string =>
      M.value(message).pipe(
        M.tags({ ChangedCount: ({ count }) => `count ${count}` }),
        M.orElse(() => 'other'),
      )

    expect(describeMessage(Message.ChangedCount({ count: 5 }))).toBe('count 5')
    expect(describeMessage(Message.ClickedReset())).toBe('other')
  })
})
