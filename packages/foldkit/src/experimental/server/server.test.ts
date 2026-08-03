// @vitest-environment node
import { Effect, Exit, Schema } from 'effect'
import { expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import type { Document } from '../../html/index.js'
import { __htmlBuilder } from '../../html/index.js'
import type { Url } from '../../url/index.js'
import {
  FOLDKIT_APP_ATTRIBUTE,
  FOLDKIT_FLAGS_ATTRIBUTE,
  renderToString,
} from './server.js'

const h = __htmlBuilder<never>()

const Flags = Schema.Struct({
  theme: Schema.String,
})
type Flags = typeof Flags.Type

const Model = Schema.Struct({
  theme: Schema.String,
  pathname: Schema.String,
})
type Model = typeof Model.Type

const view = (model: Model): Document => ({
  title: `Page ${model.pathname}`,
  canonical: `https://example.com${model.pathname}`,
  body: h.div([h.Class(model.theme)], [h.h1([], [`At ${model.pathname}`])]),
})

const routingConfig = {
  Flags,
  routing: {},
  init: (flags: Flags, url: Url): readonly [Model, ReadonlyArray<never>] => [
    Model.make({ theme: flags.theme, pathname: url.pathname }),
    [],
  ],
  view,
}

describe('renderToString', () => {
  it.effect('renders a routing application with flags', () =>
    Effect.gen(function* () {
      const rendered = yield* renderToString(routingConfig, {
        url: 'https://example.com/settings',
        flags: { theme: 'dark' },
      })

      expect(rendered.html).toContain(
        `<div class="dark" ${FOLDKIT_APP_ATTRIBUTE}="app">`,
      )
      expect(rendered.html).toContain('<h1>At /settings</h1>')
      expect(rendered.title).toBe('Page /settings')
      expect(rendered.canonical).toBe('https://example.com/settings')
    }),
  )

  it.effect('surfaces lang and dir from the Document as attribute values', () =>
    Effect.gen(function* () {
      const localizedView = (model: Model): Document => ({
        title: `Page ${model.pathname}`,
        lang: 'ar',
        dir: 'Rtl',
        body: h.div([], [h.h1([], ['مرحبا'])]),
      })
      const rendered = yield* renderToString(
        { ...routingConfig, view: localizedView },
        { url: 'https://example.com/', flags: { theme: 'dark' } },
      )

      expect(rendered.lang).toBe('ar')
      expect(rendered.dir).toBe('rtl')
    }),
  )

  it.effect('omits lang and dir when the Document does not set them', () =>
    Effect.gen(function* () {
      const rendered = yield* renderToString(routingConfig, {
        url: 'https://example.com/',
        flags: { theme: 'dark' },
      })

      expect(rendered.lang).toBeUndefined()
      expect(rendered.dir).toBeUndefined()
    }),
  )

  it.effect('embeds the Schema-encoded flags payload', () =>
    Effect.gen(function* () {
      const rendered = yield* renderToString(routingConfig, {
        url: 'https://example.com/',
        flags: { theme: 'light' },
      })

      expect(rendered.html).toContain(
        `<script type="application/json" ${FOLDKIT_FLAGS_ATTRIBUTE}="app">`,
      )
      expect(rendered.html).toContain('{"theme":"light"}')
    }),
  )

  it.effect('escapes closing tags inside the flags payload', () =>
    Effect.gen(function* () {
      const rendered = yield* renderToString(routingConfig, {
        url: 'https://example.com/',
        flags: { theme: '</script><script>alert(1)</script>' },
      })

      expect(rendered.html).not.toContain('</script><script>alert(1)')
      expect(rendered.html).toContain('\\u003c/script>')
    }),
  )

  it.effect('renders a config without flags and emits no payload', () =>
    Effect.gen(function* () {
      const rendered = yield* renderToString(
        {
          init: (): readonly [Model, ReadonlyArray<never>] => [
            Model.make({ theme: 'plain', pathname: '/' }),
            [],
          ],
          view,
        },
        { runtimeId: 'root' },
      )

      expect(rendered.html).toContain(`${FOLDKIT_APP_ATTRIBUTE}="root"`)
      expect(rendered.html).not.toContain(FOLDKIT_FLAGS_ATTRIBUTE)
    }),
  )

  it.effect('dies on an empty runtimeId', () =>
    Effect.gen(function* () {
      const exit = yield* Effect.exit(
        renderToString(
          {
            init: (): readonly [Model, ReadonlyArray<never>] => [
              Model.make({ theme: 'plain', pathname: '/' }),
              [],
            ],
            view,
          },
          { runtimeId: '' },
        ),
      )

      expect(Exit.isFailure(exit)).toBe(true)
      if (Exit.isFailure(exit)) {
        expect(String(exit.cause)).toContain('non-empty runtimeId')
      }
    }),
  )

  it.effect('fails with InvalidServerUrl for an unparseable url', () =>
    Effect.gen(function* () {
      const exit = yield* Effect.exit(
        renderToString(routingConfig, {
          url: 'not a url',
          flags: { theme: 'dark' },
        }),
      )

      expect(Exit.isFailure(exit)).toBe(true)
      if (Exit.isFailure(exit)) {
        expect(String(exit.cause)).toContain('InvalidServerUrl')
      }
    }),
  )

  it.effect('serializes a null body as a comment without a marker', () =>
    Effect.gen(function* () {
      const rendered = yield* renderToString({
        init: (): readonly [Model, ReadonlyArray<never>] => [
          Model.make({ theme: 'plain', pathname: '/' }),
          [],
        ],
        view: () => ({ title: 'Empty', body: null }),
      })

      expect(rendered.html).toBe('<!---->')
      expect(rendered.title).toBe('Empty')
    }),
  )
})
