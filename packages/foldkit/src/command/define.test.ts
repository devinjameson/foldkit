import { Effect, Schema as S } from 'effect'
import { expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import { m } from '../message/index.js'
import * as Command from './index.js'
import { __CurrentRegistry, __makeRegistry } from './interruptible/index.js'

const CompletedRunTask = m('CompletedRunTask', { taskId: S.Number })
const CompletedReadBrowserGlobal = m('CompletedReadBrowserGlobal')
const CompletedMeasureElement = m('CompletedMeasureElement')
const CompletedSaveDraft = m('CompletedSaveDraft', { draftId: S.Number })
const CompletedDoWork = m('CompletedDoWork')

describe('Command.define defers its execute body', () => {
  it('does not run the body of an args Command until the effect runs', () => {
    let bodyRunCount = 0

    const RunTask = Command.define('RunTask', {
      args: { taskId: S.Number },
      messages: [CompletedRunTask],
      execute: ({ taskId }) => {
        bodyRunCount = bodyRunCount + 1
        return Effect.succeed(CompletedRunTask({ taskId }))
      },
    })

    const instance = RunTask({ taskId: 7 })
    expect(bodyRunCount).toBe(0)

    expect(Effect.runSync(instance.effect)).toEqual(
      CompletedRunTask({ taskId: 7 }),
    )
    expect(bodyRunCount).toBe(1)
  })

  it('never runs the body of a Command that update constructs and discards', () => {
    let bodyRunCount = 0

    const ReadBrowserGlobal = Command.define('ReadBrowserGlobal', {
      args: { id: S.String },
      messages: [CompletedReadBrowserGlobal],
      execute: () => {
        bodyRunCount = bodyRunCount + 1
        return Effect.succeed(CompletedReadBrowserGlobal())
      },
    })

    ReadBrowserGlobal({ id: 'discarded' })

    expect(bodyRunCount).toBe(0)
  })

  it('surfaces a throwing body as an effect failure rather than a construction throw', () => {
    const MeasureElement = Command.define('MeasureElement', {
      args: { id: S.String },
      messages: [CompletedMeasureElement],
      execute: () => {
        throw new Error('reads a browser global')
      },
    })

    const instance = MeasureElement({ id: 'panel' })

    const exit = Effect.runSyncExit(instance.effect)
    expect(exit._tag).toBe('Failure')
  })

  it('defers the body of an interruptible args Command while keying at construction', () => {
    let bodyRunCount = 0

    const SaveDraft = Command.define('SaveDraft', {
      args: { draftId: S.Number },
      messages: [CompletedSaveDraft],
      interrupt: {
        keyFields: ['draftId'],
        toKey: ({ draftId }) => draftId.toString(),
      },
      execute: ({ draftId }) => {
        bodyRunCount = bodyRunCount + 1
        return Effect.succeed(CompletedSaveDraft({ draftId }))
      },
    })

    const instance = SaveDraft({ draftId: 3 })
    expect(instance.key).toBe('SaveDraft:3')
    expect(bodyRunCount).toBe(0)

    const result = Effect.runSync(
      Effect.provideService(
        instance.effect,
        __CurrentRegistry,
        __makeRegistry(),
      ),
    )
    expect(result).toEqual(CompletedSaveDraft({ draftId: 3 }))
    expect(bodyRunCount).toBe(1)
  })

  it('still runs a no-args Command effect, which is already a value', () => {
    let effectRunCount = 0

    const DoWork = Command.define('DoWork', {
      messages: [CompletedDoWork],
      execute: Effect.sync(() => {
        effectRunCount = effectRunCount + 1
        return CompletedDoWork()
      }),
    })

    const instance = DoWork()
    expect(effectRunCount).toBe(0)

    expect(Effect.runSync(instance.effect)).toEqual(CompletedDoWork())
    expect(effectRunCount).toBe(1)
  })
})
