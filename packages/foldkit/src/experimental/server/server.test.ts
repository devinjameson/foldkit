// @vitest-environment node
import { Effect, Schema, SchemaIssue, SchemaTransformation } from 'effect'
import { expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import type { Document } from '../../html/index.js'
import { __htmlBuilder } from '../../html/index.js'
import type { Url } from '../../url/index.js'
import type { VNode } from '../../vdom.js'
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

  it.effect('renders from the encode-then-decode round trip of the flags', () =>
    Effect.gen(function* () {
      const TrimmedTheme = Schema.String.pipe(
        Schema.decodeTo(
          Schema.String,
          SchemaTransformation.transform({
            decode: raw => raw.trim(),
            encode: theme => theme,
          }),
        ),
      )
      const rendered = yield* renderToString(
        { ...routingConfig, Flags: Schema.Struct({ theme: TrimmedTheme }) },
        { url: 'https://example.com/', flags: { theme: '  dark  ' } },
      )

      expect(rendered.html).toContain(
        `<div class="dark" ${FOLDKIT_APP_ATTRIBUTE}="app">`,
      )
      expect(rendered.html).toContain('{"theme":"  dark  "}')
    }),
  )

  it.effect(
    'fails with ServerFlagsEncodeError when the encoded flags cannot be decoded back',
    () =>
      Effect.gen(function* () {
        const PrefixedTheme = Schema.String.pipe(
          Schema.decodeTo(
            Schema.String,
            SchemaTransformation.transformOrFail({
              decode: raw =>
                raw.startsWith('theme:')
                  ? Effect.succeed(raw.slice('theme:'.length))
                  : Effect.fail(
                      new SchemaIssue.InvalidValue({
                        message: `Expected a theme: prefix, got ${raw}`,
                      }),
                    ),
              encode: theme => Effect.succeed(theme),
            }),
          ),
        )
        const error = yield* Effect.flip(
          renderToString(
            {
              ...routingConfig,
              Flags: Schema.Struct({ theme: PrefixedTheme }),
            },
            { url: 'https://example.com/', flags: { theme: 'dark' } },
          ),
        )

        expect(error).toMatchObject({ _tag: 'ServerFlagsEncodeError' })
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

  it.effect('fails with InvalidRuntimeId for an empty runtimeId', () =>
    Effect.gen(function* () {
      const error = yield* Effect.flip(
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

      expect(error).toMatchObject({
        _tag: 'InvalidRuntimeId',
        runtimeId: '',
      })
    }),
  )

  it.effect('fails with InvalidServerUrl for an unparseable url', () =>
    Effect.gen(function* () {
      const error = yield* Effect.flip(
        renderToString(routingConfig, {
          url: 'not a url',
          flags: { theme: 'dark' },
        }),
      )

      expect(error).toMatchObject({
        _tag: 'InvalidServerUrl',
        url: 'not a url',
      })
    }),
  )

  it.effect('rejects text and comment hydration roots', () =>
    Effect.gen(function* () {
      const roots: ReadonlyArray<
        Readonly<{ body: VNode; rootKind: 'Text' | 'Comment' }>
      > = [
        {
          body: {
            sel: undefined,
            data: undefined,
            children: undefined,
            elm: undefined,
            text: 'text',
            key: undefined,
          },
          rootKind: 'Text',
        },
        {
          body: {
            sel: '!',
            data: {},
            children: undefined,
            elm: undefined,
            text: 'comment',
            key: undefined,
          },
          rootKind: 'Comment',
        },
      ]

      for (const { body, rootKind } of roots) {
        const error = yield* Effect.flip(
          renderToString({
            init: (): readonly [Model, ReadonlyArray<never>] => [
              Model.make({ theme: 'plain', pathname: '/' }),
              [],
            ],
            view: () => ({ title: rootKind, body }),
          }),
        )

        expect(error).toMatchObject({
          _tag: 'InvalidHydrationRoot',
          rootKind,
        })
      }
    }),
  )

  it.effect('fails when a hydratable view has no element root', () =>
    Effect.gen(function* () {
      const error = yield* Effect.flip(
        renderToString({
          init: (): readonly [Model, ReadonlyArray<never>] => [
            Model.make({ theme: 'plain', pathname: '/' }),
            [],
          ],
          view: () => ({ title: 'Empty', body: null }),
        }),
      )

      expect(error).toMatchObject({
        _tag: 'InvalidHydrationRoot',
        rootKind: 'Empty',
      })
    }),
  )

  it.effect('reports unsafe serialized markup as a typed failure', () =>
    Effect.gen(function* () {
      const error = yield* Effect.flip(
        renderToString({
          init: (): readonly [Model, ReadonlyArray<never>] => [
            Model.make({ theme: 'plain', pathname: '/' }),
            [],
          ],
          view: () => ({
            title: 'Unsafe',
            body: h.script([], ['</script><script>alert(1)</script>']),
          }),
        }),
      )

      expect(error).toMatchObject({ _tag: 'ServerSerializationError' })
    }),
  )

  const failsHydratableRender = (body: Document['body']) =>
    Effect.gen(function* () {
      const error = yield* Effect.flip(
        renderToString({
          init: (): readonly [Model, ReadonlyArray<never>] => [
            Model.make({ theme: 'plain', pathname: '/' }),
            [],
          ],
          view: () => ({ title: 'Escapes', body }),
        }),
      )

      expect(error).toMatchObject({ _tag: 'ServerSerializationError' })
    })

  it.effect(
    'rejects a block element inside a <p> that parsing splits out',
    () =>
      failsHydratableRender(
        h.p([], [h.div([], ['inside']), h.span([], ['after'])]),
      ),
  )

  it.effect(
    'rejects a stray element inside a <table> parsing fosters out',
    () =>
      failsHydratableRender(
        h.table([], [h.div([], ['inside']), h.tr([], [h.td([], ['cell'])])]),
      ),
  )

  it.effect('rejects an HTML element inside an <svg> that breaks out', () =>
    failsHydratableRender(
      h.svg([], [h.div([h.Id('escaped')], ['inside']), h.circle([])]),
    ),
  )

  it.effect('rejects foreign InnerHTML that escapes the <svg> namespace', () =>
    failsHydratableRender(h.svg([h.InnerHTML('<strike>escaped</strike>')])),
  )

  it.effect('renders a valid svg root that parses back to one element', () =>
    Effect.gen(function* () {
      const rendered = yield* renderToString({
        init: (): readonly [Model, ReadonlyArray<never>] => [
          Model.make({ theme: 'plain', pathname: '/' }),
          [],
        ],
        view: () => ({
          title: 'Svg',
          body: h.svg([], [h.circle([])]),
        }),
      })

      expect(rendered.html).toContain(`<svg ${FOLDKIT_APP_ATTRIBUTE}="app">`)
      expect(rendered.html).toContain('<circle></circle>')
    }),
  )

  it.effect('allows a non-element root for static, non-hydratable markup', () =>
    Effect.gen(function* () {
      const rendered = yield* renderToString(
        {
          init: (): readonly [Model, ReadonlyArray<never>] => [
            Model.make({ theme: 'plain', pathname: '/' }),
            [],
          ],
          view: () => ({ title: 'Empty', body: null }),
        },
        { isHydratable: false },
      )

      expect(rendered.html).toBe('<!---->')
      expect(rendered.title).toBe('Empty')
    }),
  )
})
