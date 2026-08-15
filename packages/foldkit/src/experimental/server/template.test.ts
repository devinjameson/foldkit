import { describe, expect, it } from 'vitest'

import { injectIntoTemplate } from './template.js'

const TEMPLATE =
  '<!doctype html><html lang="en"><head><title>old</title></head>' +
  '<body><div id="root"></div></body></html>'

const HEAD_TEMPLATE =
  '<!doctype html><html lang="en"><head><title>old</title>' +
  '<link rel="canonical" href="https://example.com/old" />' +
  '<meta property="og:url" content="https://example.com/old" />' +
  '</head><body><div id="root"></div></body></html>'

const rendered = (
  overrides: Partial<Parameters<typeof injectIntoTemplate>[1]> = {},
): Parameters<typeof injectIntoTemplate>[1] => ({
  html: '<div data-foldkit-app="app">hi</div>',
  title: 'New Title',
  ...overrides,
})

describe('injectIntoTemplate', () => {
  it('injects the body and title', () => {
    const result = injectIntoTemplate(TEMPLATE, rendered())
    expect(result).toContain('<title>New Title</title>')
    expect(result).toContain(
      '<body><div data-foldkit-app="app">hi</div></body>',
    )
  })

  it('stamps lang and dir onto <html>, replacing the template lang', () => {
    const result = injectIntoTemplate(
      TEMPLATE,
      rendered({ lang: 'ar', dir: 'rtl' }),
    )
    expect(result).toContain('<html lang="ar" dir="rtl">')
    expect(result).not.toContain('lang="en"')
  })

  it('leaves <html> untouched when lang and dir are omitted', () => {
    const result = injectIntoTemplate(TEMPLATE, rendered())
    expect(result).toContain('<html lang="en">')
  })

  it('replaces a single-quoted template lang without duplicating the attribute', () => {
    const template =
      "<!doctype html><html lang='en'><head><title>old</title></head>" +
      '<body><div id="root"></div></body></html>'
    const result = injectIntoTemplate(template, rendered({ lang: 'ar' }))
    expect(result).toContain('<html lang="ar">')
    expect(result).not.toContain("lang='en'")
  })

  it('replaces an unquoted template lang without duplicating the attribute', () => {
    const template =
      '<!doctype html><html lang=en><head><title>old</title></head>' +
      '<body><div id="root"></div></body></html>'
    const result = injectIntoTemplate(template, rendered({ lang: 'ar' }))
    expect(result).toContain('<html lang="ar">')
    expect(result).not.toContain('lang=en')
  })

  it('keeps an attribute whose value contains the stamped attribute name intact', () => {
    const template =
      '<!doctype html><html data-note="my lang here"><head><title>old</title></head>' +
      '<body><div id="root"></div></body></html>'
    const result = injectIntoTemplate(template, rendered({ lang: 'en' }))
    expect(result).toContain('<html data-note="my lang here" lang="en">')
    expect(result.match(/lang="en"/g)).toHaveLength(1)
  })

  it('replaces only the canonical href, keeping sibling attributes intact', () => {
    const template =
      '<!doctype html><html><head><title>old</title>' +
      '<link rel="canonical" title="site href list" href="https://example.com/old" />' +
      '</head><body><div id="root"></div></body></html>'
    const result = injectIntoTemplate(
      template,
      rendered({ canonical: 'https://example.com/fresh' }),
    )
    expect(result).toContain(
      '<link rel="canonical" title="site href list" href="https://example.com/fresh" />',
    )
    expect(result.match(/href=/g)).toHaveLength(1)
    expect(result).not.toContain('https://example.com/old')
  })

  it('replaces only the head title, leaving an SVG title in the body alone', () => {
    const template =
      '<!doctype html><html><head><title>old</title></head>' +
      '<body><svg><title>icon label</title></svg><div id="root"></div></body></html>'
    const result = injectIntoTemplate(template, rendered())
    expect(result).toContain('<title>New Title</title>')
    expect(result).toContain('<svg><title>icon label</title></svg>')
    expect(result).not.toContain('<title>old</title>')
  })

  it('stamps past a commented-out canonical onto the real one, leaving the comment untouched', () => {
    const template =
      '<!doctype html><html><head><title>old</title>' +
      '<!-- <link rel="canonical" href="https://example.com/old" /> -->' +
      '<link rel="canonical" href="https://example.com/current" />' +
      '</head><body><div id="root"></div></body></html>'
    const result = injectIntoTemplate(
      template,
      rendered({ canonical: 'https://example.com/fresh' }),
    )
    expect(result).toContain(
      '<!-- <link rel="canonical" href="https://example.com/old" /> -->',
    )
    expect(result).toContain(
      '<link rel="canonical" href="https://example.com/fresh" />',
    )
    expect(result).not.toContain('https://example.com/current')
  })

  it('stamps the head even when a comment contains a closing head tag', () => {
    const template =
      '<!doctype html><html><head>' +
      '<!-- do not remove </head> without updating the shell -->' +
      '<title>old</title></head>' +
      '<body><div id="root"></div></body></html>'
    const result = injectIntoTemplate(template, rendered())
    expect(result).toContain('<title>New Title</title>')
    expect(result).toContain(
      '<!-- do not remove </head> without updating the shell -->',
    )
  })

  it('finds the real head when a leading comment contains a head open tag', () => {
    const template =
      '<!doctype html><html><!-- <head> was reworked in v2 -->' +
      '<head><title>old</title></head>' +
      '<body><svg><title>icon label</title></svg><div id="root"></div></body></html>'
    const result = injectIntoTemplate(template, rendered())
    expect(result).toContain('<title>New Title</title>')
    expect(result).toContain('<svg><title>icon label</title></svg>')
  })

  it('rewrites the real canonical, not the canonical-looking string in a head script', () => {
    const scriptBlock =
      '<script>const fallback = \'<link rel="canonical" href="x">\'</script>'
    const template =
      '<!doctype html><html><head><title>old</title>' +
      scriptBlock +
      '<link rel="canonical" href="https://example.com/current" />' +
      '</head><body><div id="root"></div></body></html>'
    const result = injectIntoTemplate(
      template,
      rendered({ canonical: 'https://example.com/fresh' }),
    )
    expect(result).toContain(scriptBlock)
    expect(result).toContain(
      '<link rel="canonical" href="https://example.com/fresh" />',
    )
    expect(result).not.toContain('https://example.com/current')
  })

  it('treats a script closed by an attributed end tag as inert', () => {
    const scriptBlock =
      '<script>const fallback = \'<link rel="canonical" href="x">\'</script ignored>'
    const template =
      '<!doctype html><html><head><title>old</title>' +
      scriptBlock +
      '<link rel="canonical" href="https://example.com/current" />' +
      '</head><body><div id="root"></div></body></html>'
    const result = injectIntoTemplate(
      template,
      rendered({ canonical: 'https://example.com/fresh' }),
    )
    expect(result).toContain(scriptBlock)
    expect(result).toContain(
      '<link rel="canonical" href="https://example.com/fresh" />',
    )
    expect(result).not.toContain('https://example.com/current')
  })

  it('treats a script closed by a self-closing end tag as inert', () => {
    const scriptBlock = "<script>const t = '<title>fake</title>'</script/>"
    const template =
      '<!doctype html><html><head>' +
      scriptBlock +
      '<title>old</title></head>' +
      '<body><div id="root"></div></body></html>'
    const result = injectIntoTemplate(template, rendered())
    expect(result).toContain('<title>New Title</title>')
    expect(result).toContain(scriptBlock)
  })

  it('finds the real head title past a head-looking string in a script', () => {
    const template =
      '<!doctype html><html><head>' +
      "<script>const markup = '<title>fake</title></head>'</script>" +
      '<title>old</title></head>' +
      '<body><div id="root"></div></body></html>'
    const result = injectIntoTemplate(template, rendered())
    expect(result).toContain('<title>New Title</title>')
    expect(result).toContain(
      "<script>const markup = '<title>fake</title></head>'</script>",
    )
  })

  it('stamps single-quoted canonical and og:url head elements', () => {
    const template =
      '<!doctype html><html><head><title>old</title>' +
      "<link rel='canonical' href='https://example.com/old' />" +
      "<meta property='og:url' content='https://example.com/old' />" +
      '</head><body><div id="root"></div></body></html>'
    const result = injectIntoTemplate(
      template,
      rendered({
        canonical: 'https://example.com/fresh',
        ogUrl: 'https://example.com/fresh',
      }),
    )
    expect(result).toContain('href="https://example.com/fresh"')
    expect(result).toContain('content="https://example.com/fresh"')
    expect(result).not.toContain('https://example.com/old')
  })

  it('inserts a $ sequence in the body verbatim', () => {
    const result = injectIntoTemplate(
      TEMPLATE,
      rendered({ html: '<div>price $5 & rising $&amp; $`</div>' }),
    )
    expect(result).toContain('<div>price $5 & rising $&amp; $`</div>')
  })

  it('escapes the title text', () => {
    const result = injectIntoTemplate(
      TEMPLATE,
      rendered({ title: 'Fish & <Chips>' }),
    )
    expect(result).toContain('<title>Fish &amp; &lt;Chips&gt;</title>')
  })

  it('replaces the canonical href and the og:url content', () => {
    const result = injectIntoTemplate(
      HEAD_TEMPLATE,
      rendered({
        canonical: 'https://example.com/fresh',
        ogUrl: 'https://example.com/fresh',
      }),
    )
    expect(result).toContain(
      '<link rel="canonical" href="https://example.com/fresh" />',
    )
    expect(result).toContain(
      '<meta property="og:url" content="https://example.com/fresh" />',
    )
    expect(result).not.toContain('https://example.com/old')
  })

  it('leaves the canonical and og:url template values in place when the render omits them', () => {
    const result = injectIntoTemplate(HEAD_TEMPLATE, rendered())
    expect(result).toContain(
      '<link rel="canonical" href="https://example.com/old" />',
    )
    expect(result).toContain(
      '<meta property="og:url" content="https://example.com/old" />',
    )
  })

  it('leaves the template untouched at that spot when the head element is absent', () => {
    const result = injectIntoTemplate(
      TEMPLATE,
      rendered({ canonical: 'https://example.com/fresh' }),
    )
    expect(result).not.toContain('canonical')
  })

  it('escapes an attribute-breaking canonical value', () => {
    const result = injectIntoTemplate(
      HEAD_TEMPLATE,
      rendered({ canonical: 'https://example.com/?a="b"' }),
    )
    expect(result).toContain('href="https://example.com/?a=&quot;b&quot;"')
  })

  it('rejects a container that carries extra attributes', () => {
    const template =
      '<html><head><title>t</title></head>' +
      '<body><div id="root" class="page"></div></body></html>'
    expect(() => injectIntoTemplate(template, rendered())).toThrow(
      'no exact <div id="root"></div> placeholder',
    )
  })

  it('replaces a custom container id when passed', () => {
    const template =
      '<html><head><title>t</title></head>' +
      '<body><div id="app-shell"></div></body></html>'
    const result = injectIntoTemplate(template, rendered(), {
      containerId: 'app-shell',
    })
    expect(result).toContain(
      '<body><div data-foldkit-app="app">hi</div></body>',
    )
  })

  it('throws when the template has no matching container', () => {
    const template = '<html><head><title>t</title></head><body></body></html>'
    expect(() => injectIntoTemplate(template, rendered())).toThrow(
      'no exact <div id="root"></div> placeholder',
    )
  })

  it('throws when the template has more than one matching container', () => {
    const template =
      '<html><head><title>t</title></head>' +
      '<body><div id="root"></div><div id="root"></div></body></html>'
    expect(() => injectIntoTemplate(template, rendered())).toThrow(
      'more than one <div id="root"></div> placeholder',
    )
  })

  it('throws when the template has no title element', () => {
    const template =
      '<html><head></head><body><div id="root"></div></body></html>'
    expect(() => injectIntoTemplate(template, rendered())).toThrow(
      'no <title> element',
    )
  })

  it('throws when the template has more than one title element', () => {
    const template =
      '<html><head><title>one</title><title>two</title></head>' +
      '<body><div id="root"></div></body></html>'
    expect(() => injectIntoTemplate(template, rendered())).toThrow(
      'more than one <title> element',
    )
  })
})
