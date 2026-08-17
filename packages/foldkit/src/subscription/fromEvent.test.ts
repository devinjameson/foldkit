import { Effect, Fiber, Option, Stream } from 'effect'
import { describe, expect, expectTypeOf, it } from 'vitest'

import {
  type TypedEventTarget,
  fromEvent,
  fromEventFilterMap,
} from './fromEvent.js'

type PingEvents = Readonly<{ ping: CustomEvent<string> }>

const makePingTarget = (): TypedEventTarget<PingEvents> => new EventTarget()

const tick = (): Promise<void> => new Promise(resolve => setTimeout(resolve, 0))

const drain = <Message>(
  stream: Stream.Stream<Message>,
  sink: Array<Message>,
): Effect.Effect<void> =>
  Stream.runForEach(stream, message =>
    Effect.sync(() => {
      sink.push(message)
    }),
  )

describe('fromEvent', () => {
  it('emits a Message for every dispatched event', async () => {
    const target = makePingTarget()
    const received: Array<string> = []

    const fiber = Effect.runFork(
      drain(
        fromEvent({
          target,
          type: 'ping',
          toMessage: event => event.detail,
        }),
        received,
      ),
    )

    await tick()
    target.dispatchEvent(new CustomEvent('ping', { detail: 'a' }))
    target.dispatchEvent(new CustomEvent('ping', { detail: 'b' }))
    await tick()
    await Effect.runPromise(Fiber.interrupt(fiber))

    expect(received).toEqual(['a', 'b'])
  })

  it('removes the listener when the scope closes', async () => {
    const target = makePingTarget()
    const received: Array<string> = []

    const fiber = Effect.runFork(
      drain(
        fromEvent({
          target,
          type: 'ping',
          toMessage: event => event.detail,
        }),
        received,
      ),
    )

    await tick()
    target.dispatchEvent(new CustomEvent('ping', { detail: 'a' }))
    await tick()
    await Effect.runPromise(Fiber.interrupt(fiber))

    target.dispatchEvent(new CustomEvent('ping', { detail: 'b' }))
    await tick()

    expect(received).toEqual(['a'])
  })

  it('resolves a thunk target inside the acquire Effect', async () => {
    const target = makePingTarget()
    let isResolved = false
    const received: Array<string> = []

    const fiber = Effect.runFork(
      drain(
        fromEvent({
          target: () => {
            isResolved = true
            return target
          },
          type: 'ping',
          toMessage: event => event.detail,
        }),
        received,
      ),
    )

    await tick()
    expect(isResolved).toBe(true)
    target.dispatchEvent(new CustomEvent('ping', { detail: 'a' }))
    await tick()
    await Effect.runPromise(Fiber.interrupt(fiber))

    expect(received).toEqual(['a'])
  })

  it('forwards listener options', async () => {
    const target = makePingTarget()
    const received: Array<string> = []

    const fiber = Effect.runFork(
      drain(
        fromEvent({
          target,
          type: 'ping',
          toMessage: event => event.detail,
          options: { once: true },
        }),
        received,
      ),
    )

    await tick()
    target.dispatchEvent(new CustomEvent('ping', { detail: 'a' }))
    target.dispatchEvent(new CustomEvent('ping', { detail: 'b' }))
    await tick()
    await Effect.runPromise(Fiber.interrupt(fiber))

    expect(received).toEqual(['a'])
  })
})

describe('fromEventFilterMap', () => {
  it('emits only for events the mapper keeps and skips the rest', async () => {
    const target = makePingTarget()
    const received: Array<string> = []

    const fiber = Effect.runFork(
      drain(
        fromEventFilterMap({
          target,
          type: 'ping',
          toMessage: event =>
            event.detail === 'skip' ? Option.none() : Option.some(event.detail),
        }),
        received,
      ),
    )

    await tick()
    target.dispatchEvent(new CustomEvent('ping', { detail: 'a' }))
    target.dispatchEvent(new CustomEvent('ping', { detail: 'skip' }))
    target.dispatchEvent(new CustomEvent('ping', { detail: 'b' }))
    await tick()
    await Effect.runPromise(Fiber.interrupt(fiber))

    expect(received).toEqual(['a', 'b'])
  })

  it('removes the listener when the scope closes', async () => {
    const target = makePingTarget()
    const received: Array<string> = []

    const fiber = Effect.runFork(
      drain(
        fromEventFilterMap({
          target,
          type: 'ping',
          toMessage: event => Option.some(event.detail),
        }),
        received,
      ),
    )

    await tick()
    target.dispatchEvent(new CustomEvent('ping', { detail: 'a' }))
    await tick()
    await Effect.runPromise(Fiber.interrupt(fiber))

    target.dispatchEvent(new CustomEvent('ping', { detail: 'b' }))
    await tick()

    expect(received).toEqual(['a'])
  })

  it('runs preventDefault synchronously inside the mapper', async () => {
    const target = makePingTarget()
    const received: Array<string> = []

    const fiber = Effect.runFork(
      drain(
        fromEventFilterMap({
          target,
          type: 'ping',
          toMessage: event => {
            event.preventDefault()
            return Option.some(event.detail)
          },
        }),
        received,
      ),
    )

    await tick()
    const event = new CustomEvent('ping', { detail: 'a', cancelable: true })
    target.dispatchEvent(event)
    await tick()
    await Effect.runPromise(Fiber.interrupt(fiber))

    expect(event.defaultPrevented).toBe(true)
    expect(received).toEqual(['a'])
  })
})

type InferenceMessage = Readonly<{ _tag: 'Pressed'; key: string }>

const pressed = (key: string): InferenceMessage => ({ _tag: 'Pressed', key })

declare const button: HTMLButtonElement
declare const svg: SVGSVGElement
declare const body: HTMLBodyElement
declare const chart: HTMLDivElement &
  TypedEventTarget<{ 'chart:zoomed': CustomEvent<number> }>

describe('event type inference', () => {
  it('resolves the event from the target and the event name', () => {
    const stream = fromEvent({
      target: document,
      type: 'keydown',
      toMessage: event => pressed(event.key),
    })

    expect(Stream.isStream(stream)).toBe(true)

    // NOTE: `pnpm typecheck` is the assertion for the block below, not vitest.
    // The suppression directives in it are the negative cases.
    if (false) {
      expectTypeOf(
        fromEvent({
          target: document,
          type: 'keydown',
          toMessage: event => pressed(event.key),
        }),
      ).toEqualTypeOf<Stream.Stream<InferenceMessage>>()

      fromEvent({
        target: window,
        type: 'wheel',
        toMessage: event => pressed(String(event.deltaY)),
      })

      fromEvent({
        target: () => document,
        type: 'touchmove',
        toMessage: event => pressed(String(event.touches.length)),
      })

      fromEvent({
        target: window.matchMedia('(prefers-color-scheme: dark)'),
        type: 'change',
        toMessage: event => pressed(String(event.matches)),
      })

      fromEvent({
        target: button,
        type: 'click',
        toMessage: event => pressed(String(event.clientX)),
      })

      fromEvent({
        target: svg,
        type: 'pointerdown',
        toMessage: event => pressed(String(event.pointerId)),
      })

      // lib.dom targets beyond Window, Document, and the elements resolve too.
      fromEvent({
        target: new XMLHttpRequest(),
        type: 'progress',
        toMessage: event => pressed(String(event.loaded)),
      })

      fromEvent({
        target: new Worker(''),
        type: 'message',
        toMessage: event => pressed(String(event.data)),
      })

      fromEvent({
        target: body,
        type: 'hashchange',
        toMessage: event => pressed(event.newURL),
      })

      // A declared map wins over the built-in table, so an element that
      // dispatches its own events can be annotated too.
      fromEvent({
        target: chart,
        type: 'chart:zoomed',
        toMessage: event => pressed(String(event.detail)),
      })

      // A target with no declared event map stays permissive.
      fromEvent({
        target: new EventTarget(),
        type: 'anything-at-all',
        toMessage: event => pressed(event.type),
      })

      // An annotated target resolves its own events, `detail` included.
      expectTypeOf(
        fromEventFilterMap({
          target: makePingTarget(),
          type: 'ping',
          toMessage: event => Option.some(pressed(event.detail)),
        }),
      ).toEqualTypeOf<Stream.Stream<InferenceMessage>>()

      // A mapper that never emits is a Stream<never>, which composes wherever a
      // Message-producing Stream is expected.
      const neverStream = fromEventFilterMap({
        target: window,
        type: 'keydown',
        toMessage: () => Option.none(),
      })

      expectTypeOf(neverStream).toEqualTypeOf<Stream.Stream<never>>()

      expectTypeOf(
        Stream.merge(
          neverStream,
          fromEvent({
            target: document,
            type: 'keydown',
            toMessage: event => pressed(event.key),
          }),
        ),
      ).toEqualTypeOf<Stream.Stream<InferenceMessage>>()

      // An annotated mapper parameter is checked against the resolved event
      // rather than replacing it.
      fromEvent({
        target: window,
        type: 'keydown',
        // @ts-expect-error 'keydown' resolves to a KeyboardEvent
        toMessage: (event: MouseEvent) => pressed(String(event.clientX)),
      })

      fromEvent({
        target: window,
        type: 'keydown',
        toMessage: (event: Event) => pressed(event.type),
      })

      fromEvent({
        target: document,
        // @ts-expect-error 'keydwn' is not an event Document dispatches
        type: 'keydwn',
        toMessage: () => pressed(''),
      })

      fromEvent({
        target: button,
        // @ts-expect-error 'hashchange' is a Window event, not an HTMLElement one
        type: 'hashchange',
        toMessage: () => pressed(''),
      })

      fromEvent({
        target: window,
        type: 'wheel',
        // @ts-expect-error a WheelEvent has no `key`
        toMessage: event => pressed(event.key),
      })

      fromEventFilterMap({
        target: makePingTarget(),
        // @ts-expect-error the target declares only 'ping'
        type: 'pong',
        toMessage: () => Option.none(),
      })

      fromEventFilterMap({
        target: makePingTarget(),
        type: 'ping',
        // @ts-expect-error the declared detail is a string
        toMessage: event => Option.some(pressed(event.detail.key)),
      })
    }
  })
})
