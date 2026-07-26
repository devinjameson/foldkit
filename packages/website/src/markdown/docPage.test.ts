import { html } from 'foldkit/html'
import { describe, expect, test } from 'vitest'

import { parseMarkdown } from '@foldkit/markdown/vite'

import commandsSource from '../page/core/commands.md?raw'
import manifestoSource from '../page/manifesto.md?raw'
import { islandAttributes } from './islandAttributes'
import { slugify, stripHeadingIdMarker } from './slug'
import { collectHeadings } from './tableOfContents'

const tocOf = (source: string) =>
  collectHeadings(parseMarkdown(source, { islands: islandAttributes }))
    .tableOfContents

describe('slugify', () => {
  test('lowercases and dashes non-alphanumeric runs', () => {
    expect(slugify('HTTP Requests')).toBe('http-requests')
    expect(slugify('Commands with Args')).toBe('commands-with-args')
    expect(slugify('h.submodel')).toBe('h-submodel')
    expect(slugify('Build Your Product, Not Your Architecture')).toBe(
      'build-your-product-not-your-architecture',
    )
  })
})

describe('collectHeadings', () => {
  test('extracts h2–h4 with slug ids and excludes the h1 title', () => {
    const document = parseMarkdown(
      '# Title\n\n## First Section\n\n### A Detail\n\n## Second Section',
    )

    expect(collectHeadings(document).tableOfContents).toEqual([
      { level: 'h2', id: 'first-section', text: 'First Section' },
      { level: 'h3', id: 'a-detail', text: 'A Detail' },
      { level: 'h2', id: 'second-section', text: 'Second Section' },
    ])
  })

  test('deduplicates repeated heading slugs within a document', () => {
    const document = parseMarkdown('## Overview\n\n## Overview')

    expect(
      collectHeadings(document).tableOfContents.map(entry => entry.id),
    ).toEqual(['overview', 'overview-2'])
  })

  test('advances a generated suffix past an explicit {#id} to avoid collisions', () => {
    const document = parseMarkdown('## Foo\n\n## Foo {#foo-2}\n\n## Foo')

    expect(
      collectHeadings(document).tableOfContents.map(entry => entry.id),
    ).toEqual(['foo', 'foo-2', 'foo-3'])
  })

  test('honors a trailing {#id} override and strips it from the text', () => {
    const document = parseMarkdown(
      '## createLazy {#create-lazy}\n\n## When to Use Lazy Views {#when-to-use-lazy}',
    )

    expect(collectHeadings(document).tableOfContents).toEqual([
      { level: 'h2', id: 'create-lazy', text: 'createLazy' },
      { level: 'h2', id: 'when-to-use-lazy', text: 'When to Use Lazy Views' },
    ])
  })
})

describe('stripHeadingIdMarker', () => {
  test('strips a trailing {#id} marker from plain heading text', () => {
    expect(stripHeadingIdMarker(['createLazy {#create-lazy}'])).toEqual([
      'createLazy',
    ])
  })

  test('preserves inline formatting and drops the marker-only trailing text', () => {
    const emphasis = html().span([], ['lazy'])

    expect(stripHeadingIdMarker([emphasis, ' {#when-to-use-lazy}'])).toEqual([
      emphasis,
    ])
  })

  test('leaves content without a marker untouched', () => {
    const code = html().span([], ['createLazy'])

    expect(stripHeadingIdMarker(['Use ', code])).toEqual(['Use ', code])
  })
})

describe('proof pages', () => {
  test('manifesto table of contents', () => {
    expect(tocOf(manifestoSource)).toEqual([
      {
        level: 'h2',
        id: 'the-architecture-problem',
        text: 'The Architecture Problem',
      },
      {
        level: 'h2',
        id: 'power-through-constraints',
        text: 'Power Through Constraints',
      },
      { level: 'h2', id: 'readable-by-design', text: 'Readable by Design' },
      {
        level: 'h2',
        id: 'build-your-product-not-your-architecture',
        text: 'Build Your Product, Not Your Architecture',
      },
    ])
  })

  test('commands table of contents', () => {
    expect(tocOf(commandsSource)).toEqual([
      { level: 'h2', id: 'overview', text: 'Overview' },
      { level: 'h2', id: 'anatomy-of-a-command', text: 'Anatomy of a Command' },
      { level: 'h2', id: 'testable-by-design', text: 'Testable by Design' },
      { level: 'h2', id: 'http-requests', text: 'HTTP Requests' },
      { level: 'h2', id: 'commands-with-args', text: 'Commands with Args' },
      {
        level: 'h2',
        id: 'interrupting-commands',
        text: 'Interrupting Commands',
      },
      { level: 'h3', id: 'choosing-a-key', text: 'Choosing a Key' },
      {
        level: 'h3',
        id: 'the-interrupt-constructor',
        text: 'The Interrupt Constructor',
      },
      {
        level: 'h3',
        id: 'replacing-cancelled-work',
        text: 'Replacing Cancelled Work',
      },
      {
        level: 'h3',
        id: 'cancellations-with-multiple-meanings',
        text: 'Cancellations with Multiple Meanings',
      },
    ])
  })
})
