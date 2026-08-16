// @vitest-environment node
import { Effect, Schema, SchemaIssue, SchemaTransformation } from 'effect'
import { expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import type { Document } from '../../html/index.js'
import { __htmlBuilder } from '../../html/index.js'
import type { RoutingApplicationConfigWithFlags } from '../../runtime/runtime.js'
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
    'fails with FlagsEncodeError when the encoded flags cannot be decoded back',
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

        expect(error).toMatchObject({ _tag: 'FlagsEncodeError' })
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

  it.effect('fails with InvalidUrl for an unparseable url', () =>
    Effect.gen(function* () {
      const error = yield* Effect.flip(
        renderToString(routingConfig, {
          url: 'not a url',
          flags: { theme: 'dark' },
        }),
      )

      expect(error).toMatchObject({
        _tag: 'InvalidUrl',
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

      expect(error).toMatchObject({ _tag: 'SerializationError' })
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

      expect(error).toMatchObject({ _tag: 'SerializationError' })
    })

  const rendersHydratable = (body: Document['body'], contains: string) =>
    Effect.gen(function* () {
      const rendered = yield* renderToString({
        init: (): readonly [Model, ReadonlyArray<never>] => [
          Model.make({ theme: 'plain', pathname: '/' }),
          [],
        ],
        view: () => ({ title: 'Renders', body }),
      })

      expect(rendered.html).toContain(contains)
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

  it.effect(
    'rejects a bare <tr> that parsing wraps in an implicit <tbody>',
    () => failsHydratableRender(h.table([], [h.tr([], [h.td([], ['cell'])])])),
  )

  it.effect('rejects text a <table> foster-parents out of its structure', () =>
    failsHydratableRender(
      h.div(
        [],
        [
          h.table(
            [],
            [h.tbody([], [h.tr([], [h.td([], ['cell'])]), 'stray text'])],
          ),
        ],
      ),
    ),
  )

  it.effect('renders an element whose only text child is empty', () =>
    Effect.gen(function* () {
      const rendered = yield* renderToString({
        init: (): readonly [Model, ReadonlyArray<never>] => [
          Model.make({ theme: 'plain', pathname: '/' }),
          [],
        ],
        view: () => ({
          title: 'Empty text',
          body: h.div([], [h.span([], ['']), h.span([], ['', 'kept', ''])]),
        }),
      })

      expect(rendered.html).toContain('<span></span><span>kept</span>')
    }),
  )

  it.effect('renders a table with an explicit tbody unchanged', () =>
    Effect.gen(function* () {
      const rendered = yield* renderToString({
        init: (): readonly [Model, ReadonlyArray<never>] => [
          Model.make({ theme: 'plain', pathname: '/' }),
          [],
        ],
        view: () => ({
          title: 'Table',
          body: h.table([], [h.tbody([], [h.tr([], [h.td([], ['cell'])])])]),
        }),
      })

      expect(rendered.html).toContain('<tbody><tr><td>cell</td></tr></tbody>')
    }),
  )

  it.effect('renders a standalone empty text child', () =>
    rendersHydratable(h.div([], ['']), `<div ${FOLDKIT_APP_ATTRIBUTE}="app">`),
  )

  it.effect('renders empty text before and after an element', () =>
    rendersHydratable(h.div([], ['', h.span([], ['x']), '']), '<span>x</span>'),
  )

  it.effect('renders consecutive empty and non-empty text', () =>
    rendersHydratable(h.div([], ['', 'kept', '']), '>kept</div>'),
  )

  it.effect('renders a controlled textarea value as its text content', () =>
    rendersHydratable(h.textarea([h.Value('model')]), '>model</textarea>'),
  )

  it.effect('renders an uncontrolled textarea with text children', () =>
    rendersHydratable(h.textarea([], ['hello']), '>hello</textarea>'),
  )

  it.effect(
    'rejects a textarea with element children parsing folds to text',
    () => failsHydratableRender(h.textarea([], [h.b([], ['x'])])),
  )

  it.effect(
    'pads a <pre> whose empty text precedes newline-prefixed text',
    () => rendersHydratable(h.pre([], ['', '\nfirst']), '\n\nfirst</pre>'),
  )

  it.effect(
    'pads an uncontrolled <textarea> with empty then newline-prefixed text',
    () =>
      rendersHydratable(
        h.textarea([], ['', '\nfirst']),
        '\n\nfirst</textarea>',
      ),
  )

  it.effect(
    'pads a <pre> with multiple empty text runs before the newline',
    () => rendersHydratable(h.pre([], ['', '', '\nfirst']), '\n\nfirst</pre>'),
  )

  it.effect('does not pad a <pre> whose first emitted node is an element', () =>
    rendersHydratable(
      h.pre([], [h.span([], ['x']), '\nfirst']),
      '"app"><span>x</span>\nfirst</pre>',
    ),
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

  it.effect('renders a math root with MathML-namespaced descendants', () =>
    Effect.gen(function* () {
      const rendered = yield* renderToString({
        init: (): readonly [Model, ReadonlyArray<never>] => [
          Model.make({ theme: 'plain', pathname: '/' }),
          [],
        ],
        view: () => ({
          title: 'Math',
          body: h.math([], [h.mrow([], [h.mi([], ['x']), h.mo([], ['='])])]),
        }),
      })

      expect(rendered.html).toContain(`<math ${FOLDKIT_APP_ATTRIBUTE}="app">`)
      expect(rendered.html).toContain('<mrow><mi>x</mi><mo>=</mo></mrow>')
    }),
  )

  it.effect('keeps mglyph in MathML inside a text integration point', () =>
    Effect.gen(function* () {
      const rendered = yield* renderToString({
        init: (): readonly [Model, ReadonlyArray<never>] => [
          Model.make({ theme: 'plain', pathname: '/' }),
          [],
        ],
        view: () => ({
          title: 'Math',
          body: h.math([], [h.mi([], [h.mglyph([])])]),
        }),
      })

      expect(rendered.html).toContain('<mi><mglyph></mglyph></mi>')
    }),
  )

  it.effect('treats annotation-xml with an HTML encoding as HTML content', () =>
    Effect.gen(function* () {
      const rendered = yield* renderToString({
        init: (): readonly [Model, ReadonlyArray<never>] => [
          Model.make({ theme: 'plain', pathname: '/' }),
          [],
        ],
        view: () => ({
          title: 'Math',
          body: h.math(
            [],
            [
              h['annotation-xml'](
                [h.Attribute('encoding', 'text/html')],
                [h.div([], ['x'])],
              ),
            ],
          ),
        }),
      })

      expect(rendered.html).toContain(
        '<annotation-xml encoding="text/html"><div>x</div></annotation-xml>',
      )
    }),
  )

  it.effect('matches the annotation-xml encoding case-insensitively', () =>
    Effect.gen(function* () {
      const rendered = yield* renderToString({
        init: (): readonly [Model, ReadonlyArray<never>] => [
          Model.make({ theme: 'plain', pathname: '/' }),
          [],
        ],
        view: () => ({
          title: 'Math',
          body: h.math(
            [],
            [
              h['annotation-xml'](
                [h.Attribute('ENCODING', 'TEXT/HTML')],
                [h.div([], ['x'])],
              ),
            ],
          ),
        }),
      })

      expect(rendered.html).toContain('<div>x</div></annotation-xml>')
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

  it.effect(
    'renders flags from the JSON-round-tripped value, not the in-memory encoded value',
    () =>
      Effect.gen(function* () {
        const RatioFlags = Schema.Struct({ ratio: Schema.Number })
        const RatioModel = Schema.Struct({ ratio: Schema.Number })
        type RatioModel = typeof RatioModel.Type
        const rendered = yield* renderToString(
          {
            Flags: RatioFlags,
            init: (flags: {
              ratio: number
            }): readonly [RatioModel, ReadonlyArray<never>] => [
              RatioModel.make({ ratio: flags.ratio }),
              [],
            ],
            view: (model: RatioModel): Document => ({
              title: 'Ratio',
              body: h.div([], [String(1 / model.ratio)]),
            }),
          },
          { flags: { ratio: -0 } },
        )

        // -0 serializes to 0 in the payload JSON, so the hydrating client
        // reconstructs 0 and renders 1 / 0 = Infinity. The server must render
        // that same value, not 1 / -0 = -Infinity from the in-memory encode.
        expect(rendered.html).toContain('>Infinity</div>')
        expect(rendered.html).not.toContain('-Infinity')
      }),
  )

  it.effect(
    'fails when the flags codec decodes asynchronously, which the client cannot',
    () =>
      Effect.gen(function* () {
        const AsyncTheme = Schema.String.pipe(
          Schema.decodeTo(
            Schema.String,
            SchemaTransformation.transformOrFail({
              decode: raw => Effect.promise(() => Promise.resolve(raw)),
              encode: theme => Effect.succeed(theme),
            }),
          ),
        )
        const error = yield* Effect.flip(
          renderToString(
            { ...routingConfig, Flags: Schema.Struct({ theme: AsyncTheme }) },
            { url: 'https://example.com/', flags: { theme: 'dark' } },
          ),
        )

        expect(error).toMatchObject({ _tag: 'FlagsEncodeError' })
      }),
  )

  it.effect(
    'defaults canonical and ogUrl to the request url for a routing render',
    () =>
      Effect.gen(function* () {
        const plainView = (model: Model): Document => ({
          title: `Page ${model.pathname}`,
          body: h.div([], [h.h1([], [model.pathname])]),
        })
        const rendered = yield* renderToString(
          { ...routingConfig, view: plainView },
          {
            url: 'https://example.com/deep/link?q=1',
            flags: { theme: 'dark' },
          },
        )

        expect(rendered.canonical).toBe('https://example.com/deep/link?q=1')
        expect(rendered.ogUrl).toBe('https://example.com/deep/link?q=1')
      }),
  )

  it.effect('defaults ogUrl to an explicitly set canonical', () =>
    Effect.gen(function* () {
      const canonicalView = (model: Model): Document => ({
        title: `Page ${model.pathname}`,
        canonical: 'https://example.com/canonical',
        body: h.div([], [h.h1([], [model.pathname])]),
      })
      const rendered = yield* renderToString(
        { ...routingConfig, view: canonicalView },
        { url: 'https://example.com/other', flags: { theme: 'dark' } },
      )

      expect(rendered.canonical).toBe('https://example.com/canonical')
      expect(rendered.ogUrl).toBe('https://example.com/canonical')
    }),
  )

  it.effect(
    'does not default canonical or ogUrl for a non-routing render',
    () =>
      Effect.gen(function* () {
        const rendered = yield* renderToString({
          init: (): readonly [Model, ReadonlyArray<never>] => [
            Model.make({ theme: 'plain', pathname: '/' }),
            [],
          ],
          view: () => ({ title: 'No url', body: h.div([], ['x']) }),
        })

        expect(rendered.canonical).toBeUndefined()
        expect(rendered.ogUrl).toBeUndefined()
      }),
  )

  it.effect(
    'normalizes the default canonical to match the client location',
    () =>
      Effect.gen(function* () {
        const plainView = (model: Model): Document => ({
          title: `Page ${model.pathname}`,
          body: h.div([], [h.h1([], [model.pathname])]),
        })
        const rendered = yield* renderToString(
          { ...routingConfig, view: plainView },
          {
            url: 'https://EXAMPLE.com:443/a?q=1#frag',
            flags: { theme: 'dark' },
          },
        )

        // origin lowercases the host and drops the default port, and a canonical
        // URL carries no fragment, matching the client's currentLocationUrl.
        expect(rendered.canonical).toBe('https://example.com/a?q=1')
        expect(rendered.ogUrl).toBe('https://example.com/a?q=1')
      }),
  )

  it('accepts an explicitly annotated runtime application config', () => {
    // Compile-time check: a full runtime application config is structurally
    // assignable to the server render input, as the renderToString TSDoc
    // promises. The function is never invoked; were the assignment not to hold,
    // this file would not compile.
    const acceptsRuntimeConfig = (
      config: RoutingApplicationConfigWithFlags<Model, never, Flags>,
    ) =>
      renderToString(config, {
        url: 'https://example.com/',
        flags: { theme: 'dark' },
      })
    expect(typeof acceptsRuntimeConfig).toBe('function')
  })

  it.effect(
    'renders a controlled output value as text, not an inert attribute',
    () =>
      Effect.gen(function* () {
        const rendered = yield* renderToString({
          init: (): readonly [Model, ReadonlyArray<never>] => [
            Model.make({ theme: 'plain', pathname: '/' }),
            [],
          ],
          view: () => ({ title: 'Output', body: h.output([h.Value('42')]) }),
        })

        expect(rendered.html).toContain('>42</output>')
        expect(rendered.html).not.toContain('value="42"')
      }),
  )

  it.effect(
    'marks only the first option matching a duplicated select value',
    () =>
      Effect.gen(function* () {
        const rendered = yield* renderToString({
          init: (): readonly [Model, ReadonlyArray<never>] => [
            Model.make({ theme: 'plain', pathname: '/' }),
            [],
          ],
          view: () => ({
            title: 'Select',
            body: h.select(
              [h.Value('x')],
              [
                h.option([h.Value('x')], ['First']),
                h.option([h.Value('x')], ['Second']),
              ],
            ),
          }),
        })

        expect(rendered.html).toContain(
          '<option value="x" selected="">First</option>',
        )
        expect(rendered.html).toContain('<option value="x">Second</option>')
      }),
  )

  it.effect(
    'rejects a non-breaking space a table foster-parents before the root',
    () =>
      failsHydratableRender(
        h.table([], ['\u00a0', h.tbody([], [h.tr([], [h.td([], ['cell'])])])]),
      ),
  )

  it.effect('rejects a table-cell root an in-body parse drops', () =>
    failsHydratableRender(h.td([h.Class('cell')], ['hello'])),
  )

  it.effect('rejects a bare table-row root the browser foster-parents', () =>
    failsHydratableRender(h.tr([], [h.td([], ['cell'])])),
  )

  it.effect('renders a noscript whose only content is plain text', () =>
    rendersHydratable(
      h.noscript([], ['Enable JavaScript.']),
      '>Enable JavaScript.</noscript>',
    ),
  )

  it.effect('round-trips noscript text containing markup characters', () =>
    rendersHydratable(
      h.noscript([], ['Tom & Jerry <3']),
      '>Tom & Jerry <3</noscript>',
    ),
  )

  it.effect(
    'rejects a noscript wrapping elements with a noscript-specific error',
    () =>
      Effect.gen(function* () {
        const error = yield* Effect.flip(
          renderToString({
            init: (): readonly [Model, ReadonlyArray<never>] => [
              Model.make({ theme: 'plain', pathname: '/' }),
              [],
            ],
            view: () => ({
              title: 'Noscript',
              body: h.noscript([], [h.p([], ['Enable JavaScript.'])]),
            }),
          }),
        )

        expect(error).toMatchObject({ _tag: 'SerializationError' })
        if (error._tag === 'SerializationError') {
          expect(String(error.cause)).toContain('noscript')
        }
      }),
  )

  it.effect('rejects a template with element children', () =>
    failsHydratableRender(h.template([], [h.p([], ['x'])])),
  )
})
