import { Command, given, message, model, story } from 'foldkit/story'
import { describe, expect, test } from 'vitest'

import {
  ClickedDecrement,
  ClickedIncrement,
  ClickedReset,
  type Model,
  update,
} from './main'

const initialModel: Model = { count: 0 }

describe('update', () => {
  test('ClickedIncrement adds one to the count', () => {
    story(
      update,
      given(initialModel),
      message(ClickedIncrement()),
      Command.expectNone(),
      model(model => {
        expect(model.count).toBe(1)
      }),
    )
  })

  test('ClickedDecrement subtracts one from the count', () => {
    story(
      update,
      given({ count: 5 }),
      message(ClickedDecrement()),
      model(model => {
        expect(model.count).toBe(4)
      }),
    )
  })

  test('ClickedDecrement past zero produces a negative count', () => {
    story(
      update,
      given(initialModel),
      message(ClickedDecrement()),
      model(model => {
        expect(model.count).toBe(-1)
      }),
    )
  })

  test('ClickedReset sets the count back to zero', () => {
    story(
      update,
      given({ count: 99 }),
      message(ClickedReset()),
      model(model => {
        expect(model.count).toBe(0)
      }),
    )
  })

  test('successive Messages accumulate as expected', () => {
    story(
      update,
      given(initialModel),
      message(ClickedIncrement()),
      message(ClickedIncrement()),
      message(ClickedIncrement()),
      message(ClickedDecrement()),
      model(model => {
        expect(model.count).toBe(2)
      }),
      message(ClickedReset()),
      model(model => {
        expect(model.count).toBe(0)
      }),
    )
  })
})
