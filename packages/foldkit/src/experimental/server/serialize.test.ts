import { Context, Schema as S } from 'effect'
import { afterEach, beforeEach, expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import * as CustomElement from '../../customElement/index.js'
import {
  type BoundaryRegistry,
  beginRender,
  createBoundaryRegistry,
} from '../../html/boundary.js'
import { type Html, Prop, __htmlBuilder } from '../../html/index.js'
import { clearRuntime, setRuntime } from '../../html/runtimeSingleton.js'
import {
  HYDRATION_IDENTITY_ATTRIBUTE,
  HYDRATION_KEY_ATTRIBUTE,
  hydrationIdentityMarker,
  hydrationKeyMarker,
} from '../../hydrationMarkers.js'
import { m } from '../../message/index.js'
import { h as snabbdomH } from '../../snabbdom/index.js'
import type { VNode } from '../../snabbdom/vnode.js'
import { serializeHtml } from './serialize.js'

const ClickedButton = m('ClickedButton')
const Message = S.Union([ClickedButton])
type Message = typeof Message.Type

const h = __htmlBuilder<Message>()

describe('serializeHtml', () => {
  let registry: BoundaryRegistry

  beforeEach(() => {
    registry = createBoundaryRegistry()
    setRuntime(() => {}, Context.empty(), registry)
    beginRender(registry)
  })

  afterEach(() => {
    clearRuntime()
  })

  it('serializes a null tree as an empty comment', () => {
    expect(serializeHtml(null)).toBe('<!---->')
  })

  it('escapes text content', () => {
    const view = h.div([], ['a < b & "c" > d'])
    expect(serializeHtml(view)).toBe('<div>a &lt; b &amp; "c" &gt; d</div>')
  })

  it('escapes a carriage return so text round-trips through an HTML parser', () => {
    const view = h.p([], ['a\r\nb'])
    const serialized = serializeHtml(view)
    expect(serialized).toBe('<p>a&#13;\nb</p>')

    const container = document.createElement('div')
    container.innerHTML = serialized
    expect(container.textContent).toBe('a\r\nb')
  })

  it('escapes attribute values', () => {
    const view = h.div([h.Title('a "quoted" <value> & more')])
    expect(serializeHtml(view)).toBe(
      '<div title="a &quot;quoted&quot; &lt;value> &amp; more"></div>',
    )
  })

  it('rejects attribute names that cannot be represented safely', () => {
    const view = h.div([h.Attribute('x=y onmouseover', 'alert(1)')])
    expect(() => serializeHtml(view)).toThrow('invalid attribute name')
  })

  it('does not treat a non-authored innerHTML property as raw markup', () => {
    // A property named `innerHTML` that did not come from `h.InnerHTML` (a
    // CustomElement.define property, a raw `h.Prop('innerHTML', ...)`) carries no
    // provenance marker, so the serializer must never route it to the raw-HTML
    // sink. The injected markup is dropped rather than emitted verbatim.
    const view = snabbdomH('x-card', {
      props: { innerHTML: '<img src=x onerror=alert(1)>' },
    })
    expect(serializeHtml(view)).toBe('<x-card></x-card>')
  })

  it('renders builder-authored innerHTML as raw markup', () => {
    const view = h.div([h.InnerHTML('<b>trusted</b>')])
    expect(serializeHtml(view)).toBe('<div><b>trusted</b></div>')
  })

  it('does not treat innerHTML as raw markup when a later property overwrites it', () => {
    // Provenance belongs to the value, not to the props bag: a generic property
    // written after `h.InnerHTML` owns the name from then on, so the markup it
    // wrote never reaches the raw sink.
    const view = h.div([
      h.InnerHTML('<b>trusted</b>'),
      Prop({ key: 'innerHTML', value: '<img src=x onerror=alert(1)>' }),
    ])
    const serialized = serializeHtml(view)

    expect(serialized).not.toContain('onerror')
    expect(serialized).toBe('<div></div>')
  })

  it('renders builder-authored innerHTML when it overwrites an earlier property', () => {
    // The mirror of the case above: the last write owns the name, and here it is
    // the trusted one, so the trusted markup is what is emitted.
    const view = h.div([
      Prop({ key: 'innerHTML', value: '<img src=x onerror=alert(1)>' }),
      h.InnerHTML('<b>trusted</b>'),
    ])
    const serialized = serializeHtml(view)

    expect(serialized).not.toContain('onerror')
    expect(serialized).toBe('<div><b>trusted</b></div>')
  })

  it('does not treat a custom element innerHTML property as raw markup in either order', () => {
    // A `CustomElement.define` property named `innerHTML` is a client-only
    // component property. Declaring it beside `h.InnerHTML` must not launder it,
    // whichever the view writes last.
    const card = CustomElement.define({
      tag: 'x-inner',
      properties: { innerHTML: S.String },
      events: {},
    }).withMessage(h)

    const propertyLast = card([
      h.InnerHTML('<b>trusted</b>'),
      card.InnerHTML('<img src=x onerror=alert(1)>'),
    ])
    const trustedLast = card([
      card.InnerHTML('<img src=x onerror=alert(1)>'),
      h.InnerHTML('<b>trusted</b>'),
    ])

    expect(serializeHtml(propertyLast)).toBe('<x-inner></x-inner>')
    expect(serializeHtml(trustedLast)).toBe('<x-inner><b>trusted</b></x-inner>')
  })

  it('does not reflect declared custom element properties that collide with global attribute names', () => {
    // A `CustomElement.define` property is a client-only DOM property even when
    // it carries the name of a global HTML attribute, so none of these reach the
    // markup. The values would otherwise disclose component state the view never
    // rendered.
    const card = CustomElement.define({
      tag: 'x-card',
      properties: {
        id: S.Unknown,
        title: S.String,
        lang: S.String,
        dir: S.String,
        tabIndex: S.Number,
        hidden: S.Boolean,
        inert: S.Boolean,
        draggable: S.Boolean,
      },
      events: {},
    }).withMessage(h)

    const view = card([
      card.Id({ accountId: 42 }),
      card.Title('leaked-title'),
      card.Lang('leaked-lang'),
      card.Dir('leaked-dir'),
      card.TabIndex(3),
      card.Hidden(true),
      card.Inert(true),
      card.Draggable(true),
    ])

    expect(serializeHtml(view)).toBe('<x-card></x-card>')
  })

  it('reflects builder-authored global attributes on a custom element', () => {
    // The counterpart: `h.Id` sets the reflected `id` attribute every element
    // has, so it is real markup and still serializes.
    const plain = CustomElement.define({
      tag: 'x-plain',
      properties: {},
      events: {},
    }).withMessage(h)

    const view = plain([h.Id('card-1'), h.Title('Card')])
    expect(serializeHtml(view)).toBe(
      '<x-plain id="card-1" title="Card"></x-plain>',
    )
  })

  it('does not reflect custom element properties through native property maps', () => {
    // A custom element's `value` property is a client-only DOM property, not the
    // native input `value` attribute, so it must not reflect. Only the global
    // attributes every element carries survive on a custom element.
    const view = snabbdomH('x-card', {
      props: { value: { id: 1 }, id: 'card-1' },
    })
    expect(serializeHtml(view)).toBe('<x-card id="card-1"></x-card>')
  })

  it('rejects markup-significant text in a noscript element', () => {
    const view = h.noscript(
      [],
      ['<meta http-equiv="refresh" content="0;url=/evil">'],
    )
    expect(() => serializeHtml(view)).toThrow(
      '<noscript> text content contains markup',
    )
  })

  it('renders trusted innerHTML fallback markup inside a noscript element', () => {
    const view = h.noscript([h.InnerHTML('<p>Enable JavaScript</p>')])
    expect(serializeHtml(view)).toBe(
      '<noscript><p>Enable JavaScript</p></noscript>',
    )
  })

  it('escapes carriage returns in attribute values so they round-trip', () => {
    const view = h.div([h.Title('a\r\nb')])
    const serialized = serializeHtml(view)
    expect(serialized).toBe('<div title="a&#13;\nb"></div>')

    const container = document.createElement('div')
    container.innerHTML = serialized
    expect(container.firstElementChild?.getAttribute('title')).toBe('a\r\nb')
  })

  it('rejects NUL characters in text and attribute values', () => {
    expect(() => serializeHtml(h.div([], ['a\u0000b']))).toThrow('NUL')
    expect(() => serializeHtml(h.div([h.Title('a\u0000b')]))).toThrow('NUL')
  })

  it('serializes class, style, and data attributes', () => {
    const view = h.div([
      h.Class('card highlighted'),
      h.Style({ backgroundColor: 'red', '--accent': 'blue' }),
      h.DataAttribute('itemId', '42'),
    ])
    expect(serializeHtml(view)).toBe(
      '<div data-itemid="42" class="card highlighted" style="background-color: red; --accent: blue"></div>',
    )
  })

  it('serializes prop-backed attributes with renamed names', () => {
    const view = h.label(
      [h.Id('username-label'), h.For('username'), h.Tabindex(2)],
      ['Username'],
    )
    expect(serializeHtml(view)).toBe(
      '<label id="username-label" for="username" tabindex="2">Username</label>',
    )
  })

  it('serializes boolean properties as bare attributes when true', () => {
    const view = h.input([
      h.Type('checkbox'),
      h.Checked(true),
      h.Disabled(false),
      h.Required(true),
    ])
    expect(serializeHtml(view)).toBe(
      '<input type="checkbox" checked="" required="">',
    )
  })

  it('serializes draggable as an enumerated attribute', () => {
    const view = h.div([h.Draggable(false)])
    expect(serializeHtml(view)).toBe('<div draggable="false"></div>')
  })

  it('serializes the value property on inputs', () => {
    const view = h.input([h.Type('text'), h.Value('hello')])
    expect(serializeHtml(view)).toBe('<input type="text" value="hello">')
  })

  it('serializes textarea value as escaped content', () => {
    const view = h.textarea([h.Value('line <one> & two')])
    expect(serializeHtml(view)).toBe(
      '<textarea>line &lt;one&gt; &amp; two</textarea>',
    )
  })

  it('serializes script and style content raw', () => {
    const script = h.script([], ['const x = 1 && 2;'])
    expect(serializeHtml(script)).toBe('<script>const x = 1 && 2;</script>')
    const style = h.style([], ['.a { color: red }'])
    expect(serializeHtml(style)).toBe('<style>.a { color: red }</style>')
  })

  it('rejects a closing-tag sequence inside raw-text content', () => {
    const script = h.script([], ['</script><script>alert(1)</script>'])
    expect(() => serializeHtml(script)).toThrow('</script')
    const style = h.style([], ['</style><script>evil()</script>'])
    expect(() => serializeHtml(style)).toThrow('</style')
  })

  it('allows a closing-tag prefix that continues into a longer name', () => {
    const script = h.script([], ['const tag = "</scripting"'])
    expect(serializeHtml(script)).toBe(
      '<script>const tag = "</scripting"</script>',
    )
  })

  it('rejects a raw-text closing-tag sequence followed by a carriage return', () => {
    const script = h.script([], ['const html = "</script\r>"'])
    expect(() => serializeHtml(script)).toThrow('</script')
    const style = h.style([], ['.a::after { content: "</style\r>" }'])
    expect(() => serializeHtml(style)).toThrow('</style')
  })

  it('rejects a tag name carrying markup so it cannot inject elements', () => {
    const injected: VNode = {
      sel: 'x-a><script>globalThis.pwned=1</script><x-a',
      data: {},
      children: [],
      elm: undefined,
      text: undefined,
      key: undefined,
    }
    expect(() => serializeHtml(injected)).toThrow('invalid tag name')
  })

  it('rejects a <!-- sequence in script content that would escape the parser', () => {
    const script = h.script([], ['<!--<script>globalThis.pwned=1;'])
    expect(() => serializeHtml(script)).toThrow('<!--')
    const throughInnerHtml = h.script([h.InnerHTML('<!--<script>evil()')])
    expect(() => serializeHtml(throughInnerHtml)).toThrow('<!--')
  })

  it('leaves a <!-- sequence in non-script raw text alone', () => {
    const style = h.style([], ['/* <!-- not special in CSS --> */'])
    expect(serializeHtml(style)).toBe(
      '<style>/* <!-- not special in CSS --> */</style>',
    )
  })

  it('serializes a moderately deep tree without exhausting the stack', () => {
    let node: Html = h.span([], ['leaf'])
    for (let level = 0; level < 200; level += 1) {
      node = h.div([], [node])
    }
    expect(serializeHtml(node)).toContain('<span>leaf</span>')
  })

  it('refuses a tree nested past the maximum render depth', () => {
    let node: Html = h.span([], ['leaf'])
    for (let level = 0; level < 1500; level += 1) {
      node = h.div([], [node])
    }
    expect(() => serializeHtml(node)).toThrow('maximum render depth')
  })

  it('rejects a terminating sequence inside comment text', () => {
    const comment: VNode = {
      sel: '!',
      data: {},
      children: undefined,
      elm: undefined,
      text: '--><script>evil()</script>',
      key: undefined,
    }
    expect(() => serializeHtml(comment)).toThrow('comment')
  })

  it('preserves a leading newline in controlled textarea content', () => {
    const view = h.textarea([h.Value('\nfirst line')])
    expect(serializeHtml(view)).toBe('<textarea>\n\nfirst line</textarea>')
  })

  it('preserves a leading newline in children-rendered textarea content', () => {
    const view = h.textarea([], ['\nfirst line'])
    expect(serializeHtml(view)).toBe('<textarea>\n\nfirst line</textarea>')
  })

  it('preserves a leading newline in pre content', () => {
    const view = h.pre([], ['\nline1'])
    expect(serializeHtml(view)).toBe('<pre>\n\nline1</pre>')
  })

  it('rejects a closing-tag sequence arriving through InnerHTML on raw-text elements', () => {
    const script = h.script([h.InnerHTML('</script><script>alert(1)</script>')])
    expect(() => serializeHtml(script)).toThrow('</script')
    const div = h.div([h.InnerHTML('</script> is fine outside raw text')])
    expect(serializeHtml(div)).toBe(
      '<div></script> is fine outside raw text</div>',
    )
  })

  it('keeps an empty value attribute on an option', () => {
    const view = h.select(
      [],
      [
        h.option([h.Value('')], ['Choose']),
        h.option([h.Value('us')], ['United States']),
      ],
    )
    expect(serializeHtml(view)).toBe(
      '<select><option value="">Choose</option><option value="us">United States</option></select>',
    )
  })

  it('marks the option matching a controlled select value as selected', () => {
    const view = h.select(
      [h.Value('us')],
      [
        h.option([h.Value('')], ['Choose']),
        h.option([h.Value('us')], ['United States']),
      ],
    )
    expect(serializeHtml(view)).toBe(
      '<select><option value="">Choose</option><option value="us" selected="">United States</option></select>',
    )
  })

  it('matches a controlled select value against option text when no value attribute is set', () => {
    const view = h.select(
      [h.Value('Two')],
      [h.option([], ['One']), h.option([], ['Two'])],
    )
    expect(serializeHtml(view)).toBe(
      '<select><option>One</option><option selected="">Two</option></select>',
    )
  })

  it('collapses option label whitespace when matching a controlled select value', () => {
    const view = h.select(
      [h.Value('Two words')],
      [h.option([], ['One']), h.option([], ['Two\n      words'])],
    )
    expect(serializeHtml(view)).toBe(
      '<select><option>One</option><option selected="">Two\n      words</option></select>',
    )
  })

  it('omits a redundant empty value attribute on an input', () => {
    const view = h.input([h.Type('text'), h.Value('')])
    expect(serializeHtml(view)).toBe('<input type="text">')
  })

  it('omits end tags for void elements', () => {
    const view = h.div([], [h.br([]), h.img([h.Src('/cat.png'), h.Alt('cat')])])
    expect(serializeHtml(view)).toBe(
      '<div><br><img src="/cat.png" alt="cat"></div>',
    )
  })

  it('drops event handlers and emits no key marker when the render is not hydratable', () => {
    // Event handlers and mount markers are client behavior and never serialize.
    // The key marker is part of the hydration handoff, so output nobody will
    // hydrate carries none of it either.
    const view = h.keyed('button')(
      'submit',
      [h.OnClick(ClickedButton()), h.Id('submit')],
      ['Send'],
    )
    expect(serializeHtml(view)).toBe('<button id="submit">Send</button>')
  })

  it('stamps a hydratable key as a digest rather than the key itself', () => {
    // A key is application data (a row id, an account identifier, an email) that
    // the view never renders, so hydration compares digests and the key itself
    // never reaches the markup.
    const view = h.keyed('li')('user@example.com', [], ['Ada'])
    const serialized = serializeHtml(view, { emitHydrationMarkers: true })

    expect(serialized).not.toContain('user@example.com')
    expect(serialized).toBe(
      `<li ${HYDRATION_KEY_ATTRIBUTE}="${hydrationKeyMarker('user@example.com')}">Ada</li>`,
    )
  })

  it('stamps a hydratable view identity as a digest rather than the source path', () => {
    // The compiler's identity spells out a relative source path and function
    // name. Digesting it keeps the build's file layout out of public HTML.
    const view = h.div([], ['Home'])
    if (view === null) {
      throw new Error('expected the view to produce a vnode')
    }
    view.identity = 'src/page/account/billing.ts:BillingView'
    const serialized = serializeHtml(view, { emitHydrationMarkers: true })

    expect(serialized).not.toContain('src/page/account/billing.ts')
    expect(serialized).not.toContain('BillingView')
    expect(serialized).toBe(
      `<div ${HYDRATION_IDENTITY_ATTRIBUTE}="${hydrationIdentityMarker('src/page/account/billing.ts:BillingView')}">Home</div>`,
    )
  })

  it('digests a numeric key differently from the same digits as a string', () => {
    // The runtime compares keys with `===`, so 1 and '1' are different keys. A
    // digest that collapsed them would let a numeric server row adopt a string
    // client row, carrying one row's typed state onto another.
    const numeric = serializeHtml(h.keyed('li')(1, [], ['one']), {
      emitHydrationMarkers: true,
    })
    const string = serializeHtml(h.keyed('li')('1', [], ['one']), {
      emitHydrationMarkers: true,
    })

    expect(numeric).not.toBe(string)
    expect(hydrationKeyMarker(1)).not.toBe(hydrationKeyMarker('1'))
  })

  it('refuses to render an element keyed by a symbol as hydratable', () => {
    // A local symbol is a new value in every realm, so the server's key and the
    // client's cannot be compared. Rejecting beats adopting on a guess.
    const view = h.keyed('li')(Symbol('row'), [], ['one'])
    expect(() => serializeHtml(view, { emitHydrationMarkers: true })).toThrow(
      'keyed by a symbol',
    )
  })

  it('filters null children', () => {
    const view = h.ul([], [h.li([], ['one']), h.empty, h.li([], ['two'])])
    expect(serializeHtml(view)).toBe('<ul><li>one</li><li>two</li></ul>')
  })

  it('serializes svg subtrees', () => {
    const view = h.svg(
      [h.ViewBox('0 0 10 10')],
      [h.path([h.D('M0 0L10 10'), h.Fill('none')])],
    )
    expect(serializeHtml(view)).toBe(
      '<svg viewBox="0 0 10 10"><path d="M0 0L10 10" fill="none"></path></svg>',
    )
  })

  it('neutralizes a javascript: URL on navigation and resource attributes', () => {
    expect(serializeHtml(h.a([h.Href('javascript:evil()')], ['go']))).toBe(
      '<a href="">go</a>',
    )
    expect(serializeHtml(h.img([h.Src('vbscript:evil()')]))).toBe(
      '<img src="">',
    )
    expect(serializeHtml(h.form([h.Action('JavaScript:evil()')]))).toBe(
      '<form action=""></form>',
    )
  })

  it('neutralizes a javascript: URL obfuscated with control characters', () => {
    const view = h.a([h.Href('java\tscript:evil()')], ['go'])
    expect(serializeHtml(view)).toBe('<a href="">go</a>')
  })

  it('leaves safe URLs on navigation attributes unchanged', () => {
    expect(serializeHtml(h.a([h.Href('/route?x=a:b')], ['go']))).toBe(
      '<a href="/route?x=a:b">go</a>',
    )
    expect(
      serializeHtml(h.a([h.Href('mailto:hi@example.com')], ['mail'])),
    ).toBe('<a href="mailto:hi@example.com">mail</a>')
  })

  it('escapes text children of a foreign-namespace script instead of emitting raw text', () => {
    const view = h.svg([], [h.script([], ['<img src=x onerror="evil()">'])])
    const serialized = serializeHtml(view)
    expect(serialized).not.toContain('<img')
    expect(serialized).toBe(
      '<svg><script>&lt;img src=x onerror="evil()"&gt;</script></svg>',
    )
  })

  it('closes an HTML void element name in the SVG namespace so siblings stay siblings', () => {
    const view = h.svg([], [h.input([]), h.circle([])])
    expect(serializeHtml(view)).toBe(
      '<svg><input></input><circle></circle></svg>',
    )
  })

  it('treats an HTML void element as void inside a foreignObject integration point', () => {
    const view = h.svg([], [h.foreignObject([], [h.input([])])])
    expect(serializeHtml(view)).toBe(
      '<svg><foreignObject><input></foreignObject></svg>',
    )
  })

  it('serializes HTML content inside an SVG desc in the HTML namespace', () => {
    const view = h.svg([], [h.desc([], [h.input([])])])
    expect(serializeHtml(view)).toBe('<svg><desc><input></desc></svg>')
  })

  it('serializes HTML content wrapped in a foreignObject', () => {
    const view = h.svg([], [h.foreignObject([], [h.div([], ['inside'])])])
    expect(serializeHtml(view)).toBe(
      '<svg><foreignObject><div>inside</div></foreignObject></svg>',
    )
  })

  it('serializes iframe text children as raw text, not escaped', () => {
    const view = h.iframe([], ['<b>&'])
    expect(serializeHtml(view)).toBe('<iframe><b>&</iframe>')
  })

  it('rejects iframe content that contains a closing-tag sequence', () => {
    const view = h.iframe([], ['</iframe>'])
    expect(() => serializeHtml(view)).toThrow(/<\/iframe/)
  })

  it('emits InnerHTML raw', () => {
    const view = h.div([h.InnerHTML('<em>raw</em>')])
    expect(serializeHtml(view)).toBe('<div><em>raw</em></div>')
  })

  it('stamps root attributes on the root element only', () => {
    const view = h.div([h.Class('page')], [h.span([], ['inner'])])
    expect(
      serializeHtml(view, { rootAttributes: { 'data-mark': 'yes' } }),
    ).toBe('<div class="page" data-mark="yes"><span>inner</span></div>')
  })

  it('lets a root attribute win over a same-named attribute from the view', () => {
    const view = h.div([h.DataAttribute('mark', 'spoofed')])
    expect(
      serializeHtml(view, { rootAttributes: { 'data-mark': 'yes' } }),
    ).toBe('<div data-mark="yes"></div>')
  })

  it('serializes deeply nested trees', () => {
    const item = (label: string): Html =>
      h.li([h.Class('item')], [h.span([], [label])])
    const view = h.main([], [h.section([], [h.ul([], [item('a'), item('b')])])])
    expect(serializeHtml(view)).toBe(
      '<main><section><ul><li class="item"><span>a</span></li><li class="item"><span>b</span></li></ul></section></main>',
    )
  })
})
