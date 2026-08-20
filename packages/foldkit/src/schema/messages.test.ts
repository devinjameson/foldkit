import { Match as M, Schema as S } from 'effect'
import { describe, expect, it } from 'vitest'

import { messages } from './index.js'

const Message = messages({
  ClickedReset: {},
  ChangedCount: { count: S.Number },
  SelectedItem: { id: S.String, label: S.String },
})
type Message = typeof Message.Type

describe('messages', () => {
  it('builds a callable constructor for a variant with no fields', () => {
    expect(Message.ClickedReset()).toStrictEqual({ _tag: 'ClickedReset' })
  })

  it('builds a callable constructor for a variant with fields', () => {
    expect(Message.ChangedCount({ count: 1 })).toStrictEqual({
      _tag: 'ChangedCount',
      count: 1,
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

  it('carries the tagged union utilities', () => {
    expect(Object.keys(Message.cases)).toStrictEqual([
      'ClickedReset',
      'ChangedCount',
      'SelectedItem',
    ])
    expect(Message.guards.ClickedReset(Message.ClickedReset())).toBe(true)
    expect(
      Message.isAnyOf(['ClickedReset'])(Message.ChangedCount({ count: 1 })),
    ).toBe(false)
  })

  it('works with exhaustive tag matching', () => {
    const describeMessage = (message: Message): string =>
      M.value(message).pipe(
        M.withReturnType<string>(),
        M.tagsExhaustive({
          ClickedReset: () => 'reset',
          ChangedCount: ({ count }) => `count ${count}`,
          SelectedItem: ({ label }) => `selected ${label}`,
        }),
      )

    expect(describeMessage(Message.ClickedReset())).toBe('reset')
    expect(describeMessage(Message.ChangedCount({ count: 4 }))).toBe('count 4')
  })

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
