import { Command, given, message, model, story } from 'foldkit/story'
import { describe, expect, test } from 'vitest'

import {
  ChangedBackgroundColor,
  ChangedFillColor,
  type Model,
  UpdatedContent,
  update,
} from './main'

const initialModel: Model = {
  content: 'https://foldkit.dev',
  fillColor: '#1e1b4b',
  backgroundColor: '#fef3c7',
}

describe('update', () => {
  describe('content', () => {
    test('UpdatedContent stores the encoded value', () => {
      story(
        update,
        given(initialModel),
        message(UpdatedContent({ value: 'WIFI:S:Network;T:WPA;P:secret;;' })),
        model(model => {
          expect(model.content).toBe('WIFI:S:Network;T:WPA;P:secret;;')
        }),
      )
    })

    test('clearing the input stores the empty string', () => {
      story(
        update,
        given(initialModel),
        message(UpdatedContent({ value: '' })),
        model(model => {
          expect(model.content).toBe('')
        }),
      )
    })
  })

  describe('color changes', () => {
    test('ChangedFillColor replaces only the fill', () => {
      story(
        update,
        given(initialModel),
        message(ChangedFillColor({ value: '#0f766e' })),
        model(model => {
          expect(model.fillColor).toBe('#0f766e')
          expect(model.backgroundColor).toBe(initialModel.backgroundColor)
          expect(model.content).toBe(initialModel.content)
        }),
      )
    })

    test('ChangedBackgroundColor replaces only the background', () => {
      story(
        update,
        given(initialModel),
        message(ChangedBackgroundColor({ value: '#ffffff' })),
        model(model => {
          expect(model.backgroundColor).toBe('#ffffff')
          expect(model.fillColor).toBe(initialModel.fillColor)
        }),
      )
    })

    test('successive color changes accumulate', () => {
      story(
        update,
        given(initialModel),
        message(ChangedFillColor({ value: '#9d174d' })),
        message(ChangedBackgroundColor({ value: '#ffffff' })),
        message(ChangedFillColor({ value: '#0f766e' })),
        model(model => {
          expect(model.fillColor).toBe('#0f766e')
          expect(model.backgroundColor).toBe('#ffffff')
        }),
      )
    })

    test('update never produces Commands', () => {
      story(
        update,
        given(initialModel),
        message(ChangedFillColor({ value: '#9d174d' })),
        Command.expectNone(),
      )
    })
  })
})
