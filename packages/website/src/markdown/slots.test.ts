import { html } from 'foldkit/html'
import { describe, expect, test } from 'vitest'

import { type Slots, emptySlots, renderFaqSection, resolveDemo } from './slots'

describe('resolveDemo', () => {
  test('returns the demo the page registered under that name', () => {
    const demo = html().div([html().Class('live-demo')], ['demo content'])
    const slots: Slots<'registered'> = { demos: { registered: demo } }

    expect(resolveDemo(slots, 'registered')).toBe(demo)
  })

  test('renders empty for a name no page registered', () => {
    expect(resolveDemo(emptySlots, 'never-registered')).toEqual(html().empty)
  })
})

describe('renderFaqSection', () => {
  test('hands the island id, question, and rendered children to the shell', () => {
    const answer = [html().p([], ['Because it is.'])]
    const wrapped = html().section([], ['wrapped'])
    const received: Array<{
      id: string
      question: string
      content: ReadonlyArray<unknown>
    }> = []

    const slots: Slots<never> = {
      demos: {},
      renderFaq: (id, question, content) => {
        received.push({ id, question, content })
        return wrapped
      },
    }

    expect(renderFaqSection(slots, 'faq-routing', 'How?', answer)).toBe(wrapped)
    expect(received).toEqual([
      { id: 'faq-routing', question: 'How?', content: answer },
    ])
  })

  test('falls back to the question above its answer with no shell supplied', () => {
    const answer = html().p([], ['Because it is.'])
    const fallback = renderFaqSection(emptySlots, 'faq-routing', 'How?', [
      answer,
    ])

    expect(fallback).toMatchObject({
      sel: 'div',
      children: [{ sel: 'p', children: [{ text: 'How?' }] }, answer],
    })
  })
})
