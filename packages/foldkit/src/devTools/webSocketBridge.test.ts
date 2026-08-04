import {
  Array,
  Effect,
  Match,
  Number,
  Option,
  Schema,
  SubscriptionRef,
} from 'effect'
import { describe, expect, it } from 'vitest'

import { m } from '../message/index.js'
import { evo } from '../struct/index.js'
import {
  MAX_DISPATCH_BATCH_SIZE,
  type Request,
  RequestDispatchMessage,
  RequestDispatchMessages,
} from './protocol.js'
import {
  type Bridge,
  type CreateDevToolsStoreOptions,
  createDevToolsStore,
} from './store.js'
import { dispatchRequest } from './webSocketBridge.js'

const CounterModel = Schema.Struct({ count: Schema.Number })
type CounterModel = typeof CounterModel.Type

const initialModel = CounterModel.make({ count: 0 })

const ClickedIncrement = m('ClickedIncrement')
const ClickedDecrement = m('ClickedDecrement')

const CounterMessage = Schema.Union([ClickedIncrement, ClickedDecrement])
type CounterMessage = typeof CounterMessage.Type

const clickedIncrement = ClickedIncrement()
const clickedDecrement = ClickedDecrement()

const update = (model: CounterModel, message: CounterMessage): CounterModel =>
  Match.value(message).pipe(
    Match.withReturnType<CounterModel>(),
    Match.tagsExhaustive({
      ClickedIncrement: () => evo(model, { count: Number.increment }),
      ClickedDecrement: () => evo(model, { count: Number.decrement }),
    }),
  )

const decodeCounterMessage = Schema.decodeUnknownSync(CounterMessage)

const run = <A>(effect: Effect.Effect<A>): A => Effect.runSync(effect)

const makeBridge = (): Bridge => ({
  replay: model => model,
  render: () => Effect.void,
  markRenderPending: Effect.void,
})

const makeHarness = (
  maybeMessageSchema: Option.Option<Schema.Codec<any, any>> = Option.some(
    CounterMessage,
  ),
  storeOptions: CreateDevToolsStoreOptions = {},
) => {
  const store = run(createDevToolsStore(makeBridge(), storeOptions))
  run(store.recordInit(initialModel, []))

  const dispatched: Array<unknown> = []
  let liveModel = initialModel

  const dispatch = (message: unknown) =>
    Effect.gen(function* () {
      const counterMessage = decodeCounterMessage(message)
      dispatched.push(counterMessage)
      const modelBeforeUpdate = liveModel
      liveModel = update(modelBeforeUpdate, counterMessage)
      yield* store.recordMessage(
        counterMessage,
        modelBeforeUpdate,
        liveModel,
        [],
        true,
      )
    })

  run(dispatch(clickedIncrement))
  run(dispatch(clickedIncrement))
  dispatched.length = 0

  const maybeDispatchSchema = Option.map(maybeMessageSchema, Schema.toCodecJson)

  const callBridge = (request: Request) =>
    run(
      dispatchRequest(
        store,
        dispatch,
        maybeDispatchSchema,
        Option.none(),
        request,
      ),
    )

  const recordedTags = (): ReadonlyArray<string> =>
    Array.map(
      run(SubscriptionRef.get(store.stateRef)).entries,
      ({ tag }) => tag,
    )

  const tagAt = (index: number): string => {
    const { entries, startIndex } = run(SubscriptionRef.get(store.stateRef))
    return Option.match(Array.get(entries, index - startIndex), {
      onNone: () => `no entry recorded at index ${index}`,
      onSome: ({ tag }) => tag,
    })
  }

  return { dispatched, callBridge, recordedTags, tagAt }
}

describe('dispatchRequest', () => {
  describe('RequestDispatchMessage', () => {
    it('decodes the payload, dispatches it, and predicts the history index', () => {
      const { dispatched, callBridge, tagAt } = makeHarness()

      const response = callBridge(
        RequestDispatchMessage({ message: { _tag: 'ClickedIncrement' } }),
      )

      if (response._tag !== 'ResponseDispatched') {
        throw new Error(`Expected ResponseDispatched, got ${response._tag}`)
      }
      expect(response.acceptedAtIndex).toBe(2)
      expect(dispatched).toEqual([clickedIncrement])
      expect(tagAt(response.acceptedAtIndex)).toBe('ClickedIncrement')
    })

    it('rejects a payload that does not match the Message Schema', () => {
      const { dispatched, callBridge, recordedTags } = makeHarness()

      const response = callBridge(
        RequestDispatchMessage({ message: { _tag: 'Nonsense' } }),
      )

      expect(response._tag).toBe('ResponseError')
      expect(dispatched).toEqual([])
      expect(recordedTags()).toEqual(['ClickedIncrement', 'ClickedIncrement'])
    })
  })

  describe('RequestDispatchMessages', () => {
    it('dispatches every Message in order and predicts each history index', () => {
      const { dispatched, callBridge, tagAt } = makeHarness()

      const response = callBridge(
        RequestDispatchMessages({
          messages: [
            { _tag: 'ClickedIncrement' },
            { _tag: 'ClickedDecrement' },
            { _tag: 'ClickedIncrement' },
          ],
        }),
      )

      if (response._tag !== 'ResponseDispatchedBatch') {
        throw new Error(
          `Expected ResponseDispatchedBatch, got ${response._tag}`,
        )
      }
      expect(response.acceptedAtIndices).toEqual([2, 3, 4])
      expect(dispatched).toEqual([
        clickedIncrement,
        clickedDecrement,
        clickedIncrement,
      ])
      expect(Array.map(response.acceptedAtIndices, tagAt)).toEqual([
        'ClickedIncrement',
        'ClickedDecrement',
        'ClickedIncrement',
      ])
    })

    it('predicts indices against a history that has evicted its oldest entries', () => {
      const { callBridge, tagAt } = makeHarness(Option.some(CounterMessage), {
        maxEntries: 3,
        keyframeInterval: 1,
      })

      const response = callBridge(
        RequestDispatchMessages({
          messages: [
            { _tag: 'ClickedIncrement' },
            { _tag: 'ClickedDecrement' },
          ],
        }),
      )

      if (response._tag !== 'ResponseDispatchedBatch') {
        throw new Error(
          `Expected ResponseDispatchedBatch, got ${response._tag}`,
        )
      }
      expect(response.acceptedAtIndices).toEqual([2, 3])
      expect(Array.map(response.acceptedAtIndices, tagAt)).toEqual([
        'ClickedIncrement',
        'ClickedDecrement',
      ])
    })

    it('rejects the whole batch when one entry is invalid and dispatches nothing', () => {
      const { dispatched, callBridge, recordedTags } = makeHarness()

      const response = callBridge(
        RequestDispatchMessages({
          messages: [
            { _tag: 'ClickedIncrement' },
            { _tag: 'Nonsense' },
            { _tag: 'ClickedIncrement' },
          ],
        }),
      )

      if (response._tag !== 'ResponseError') {
        throw new Error(`Expected ResponseError, got ${response._tag}`)
      }
      expect(response.reason).toContain('zero-based batch position 1')
      expect(response.reason).toContain(
        'No Messages from the batch were dispatched.',
      )
      expect(dispatched).toEqual([])
      expect(recordedTags()).toEqual(['ClickedIncrement', 'ClickedIncrement'])
    })

    it('accepts an empty batch and dispatches nothing', () => {
      const { dispatched, callBridge, recordedTags } = makeHarness()

      const response = callBridge(RequestDispatchMessages({ messages: [] }))

      if (response._tag !== 'ResponseDispatchedBatch') {
        throw new Error(
          `Expected ResponseDispatchedBatch, got ${response._tag}`,
        )
      }
      expect(response.acceptedAtIndices).toEqual([])
      expect(dispatched).toEqual([])
      expect(recordedTags()).toEqual(['ClickedIncrement', 'ClickedIncrement'])
    })

    it('rejects a batch larger than the supported size and dispatches nothing', () => {
      const { dispatched, callBridge, recordedTags } = makeHarness()

      const response = callBridge(
        RequestDispatchMessages({
          messages: Array.makeBy(MAX_DISPATCH_BATCH_SIZE + 1, () => ({
            _tag: 'ClickedIncrement',
          })),
        }),
      )

      if (response._tag !== 'ResponseError') {
        throw new Error(`Expected ResponseError, got ${response._tag}`)
      }
      expect(response.reason).toContain('Batch too large')
      expect(dispatched).toEqual([])
      expect(recordedTags()).toEqual(['ClickedIncrement', 'ClickedIncrement'])
    })

    it('rejects dispatch when no Message Schema is configured', () => {
      const { dispatched, callBridge, recordedTags } = makeHarness(
        Option.none(),
      )

      const response = callBridge(
        RequestDispatchMessages({ messages: [{ _tag: 'ClickedIncrement' }] }),
      )

      if (response._tag !== 'ResponseError') {
        throw new Error(`Expected ResponseError, got ${response._tag}`)
      }
      expect(response.reason).toContain('DevToolsConfig.Message not configured')
      expect(dispatched).toEqual([])
      expect(recordedTags()).toEqual(['ClickedIncrement', 'ClickedIncrement'])
    })
  })
})
