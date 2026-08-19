import { Effect, Fiber, Match as M, Schema as S } from 'effect'
import { afterEach, expect, it, vi } from 'vitest'

import type { Command } from '../command/index.js'
import { m } from '../message/index.js'

const Ignored = m('Ignored')
const Message = S.Union([Ignored])
type Message = typeof Message.Type

const Model = S.Struct({ label: S.String })
type Model = typeof Model.Type

const update = (
  model: Model,
  message: Message,
): readonly [Model, ReadonlyArray<Command<Message>>] =>
  M.value(message).pipe(
    M.withReturnType<readonly [Model, ReadonlyArray<Command<Message>>]>(),
    M.tagsExhaustive({ Ignored: () => [model, []] }),
  )

afterEach(() => {
  Reflect.deleteProperty(
    document,
    Symbol.for('@foldkit/runtime/active-page-owner'),
  )
  document.body.innerHTML = ''
  vi.resetModules()
})

it('coordinates page ownership across isolated runtime module copies', async () => {
  const firstRuntime = await import('./runtime.js')
  const firstHtml = await import('../html/index.js')
  vi.resetModules()
  const secondRuntime = await import('./runtime.js')
  const secondHtml = await import('../html/index.js')

  expect(firstRuntime.makeApplication).not.toBe(secondRuntime.makeApplication)

  const firstContainer = document.createElement('div')
  firstContainer.id = 'first-copy'
  document.body.appendChild(firstContainer)
  const secondContainer = document.createElement('div')
  secondContainer.id = 'second-copy'
  document.body.appendChild(secondContainer)

  const firstH = firstHtml.__htmlBuilder<Message>()
  const first = firstRuntime.makeApplication({
    Model,
    init: () => [{ label: 'first-copy' }, []],
    update,
    view: model => ({
      title: model.label,
      body: firstH.div([], [model.label]),
    }),
    container: firstContainer,
  })
  const secondH = secondHtml.__htmlBuilder<Message>()
  const second = secondRuntime.makeApplication({
    Model,
    init: () => [{ label: 'second-copy' }, []],
    update,
    view: model => ({
      title: model.label,
      body: secondH.div([], [model.label]),
    }),
    container: secondContainer,
  })

  const firstFiber = Effect.runFork(first.start())
  try {
    await vi.waitFor(() => {
      expect(document.body.textContent).toContain('first-copy')
    })
    await expect(
      Effect.runPromise(second.start().pipe(Effect.timeout('250 millis'))),
    ).rejects.toThrow('already has an active page-owning application')
  } finally {
    await Effect.runPromise(Fiber.interrupt(firstFiber))
  }

  const secondFiber = Effect.runFork(second.start())
  try {
    await vi.waitFor(() => {
      expect(document.body.textContent).toContain('second-copy')
    })
  } finally {
    await Effect.runPromise(Fiber.interrupt(secondFiber))
  }
})
