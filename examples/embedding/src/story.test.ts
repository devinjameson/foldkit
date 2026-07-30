import { Command, given, message, model, story } from 'foldkit/story'
import { describe, expect, test } from 'vitest'

import {
  ChangedStep,
  ClickedAdvance,
  CompletedReportCount,
  type Model,
  ReportCount,
  Ticked,
  update,
} from './main'

const initialModel: Model = { count: 10, step: 1 }

describe('update', () => {
  describe('counting', () => {
    test('Ticked advances the count by the step and reports it on the outbound port', () => {
      story(
        update,
        given({ ...initialModel, step: 3 }),
        message(Ticked()),
        model(model => {
          expect(model.count).toBe(13)
        }),
        Command.expectHas(ReportCount),
        Command.resolve(ReportCount, CompletedReportCount()),
      )
    })

    test('ClickedAdvance advances the count by the step and reports it', () => {
      story(
        update,
        given(initialModel),
        message(ClickedAdvance()),
        model(model => {
          expect(model.count).toBe(11)
        }),
        Command.expectHas(ReportCount),
        Command.resolve(ReportCount, CompletedReportCount()),
      )
    })
  })

  describe('host input', () => {
    test('ChangedStep stores the step pushed in by the host', () => {
      story(
        update,
        given(initialModel),
        message(ChangedStep({ step: 7 })),
        model(model => {
          expect(model.step).toBe(7)
          expect(model.count).toBe(10)
        }),
        Command.expectNone(),
      )
    })

    test('a changed step applies from the next tick onward', () => {
      story(
        update,
        given(initialModel),
        message(ChangedStep({ step: 5 })),
        message(Ticked()),
        model(model => {
          expect(model.count).toBe(15)
        }),
        Command.resolve(ReportCount, CompletedReportCount()),
      )
    })
  })
})
