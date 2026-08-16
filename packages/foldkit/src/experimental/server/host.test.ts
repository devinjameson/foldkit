import { describe, expect, it } from 'vitest'

import { acceptsHtml, resolvesToIndexHtml } from './host.js'

describe('acceptsHtml', () => {
  it('accepts an absent or empty header', () => {
    expect(acceptsHtml(undefined)).toBe(true)
    expect(acceptsHtml('')).toBe(true)
    expect(acceptsHtml('   ')).toBe(true)
  })

  it('accepts a browser navigation header', () => {
    expect(
      acceptsHtml(
        'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      ),
    ).toBe(true)
  })

  it('accepts the fetch default and text ranges', () => {
    expect(acceptsHtml('*/*')).toBe(true)
    expect(acceptsHtml('text/*')).toBe(true)
  })

  it('refuses a header that does not cover html', () => {
    expect(acceptsHtml('application/json')).toBe(false)
    expect(acceptsHtml('image/png, application/json')).toBe(false)
  })

  it('refuses text/html with a zero quality even alongside a wildcard', () => {
    expect(acceptsHtml('text/html;q=0')).toBe(false)
    expect(acceptsHtml('text/html;q=0, */*')).toBe(false)
  })

  it('lets the most specific range decide the quality', () => {
    expect(acceptsHtml('text/html;q=0.1, application/json')).toBe(true)
    expect(acceptsHtml('*/*;q=0')).toBe(false)
  })
})

describe('resolvesToIndexHtml', () => {
  it('resolves the root and index.html', () => {
    expect(resolvesToIndexHtml('/')).toBe(true)
    expect(resolvesToIndexHtml('/index.html')).toBe(true)
  })

  it('resolves encoded, dotted, and repeated-separator paths', () => {
    expect(resolvesToIndexHtml('/%2findex.html')).toBe(true)
    expect(resolvesToIndexHtml('/%69ndex.html')).toBe(true)
    expect(resolvesToIndexHtml('/foo/../index.html')).toBe(true)
    expect(resolvesToIndexHtml('//index.html')).toBe(true)
    expect(resolvesToIndexHtml('/INDEX.HTML')).toBe(true)
    expect(resolvesToIndexHtml('/index.html?v=1')).toBe(true)
  })

  it('does not resolve real assets or other routes', () => {
    expect(resolvesToIndexHtml('/assets/app.js')).toBe(false)
    expect(resolvesToIndexHtml('/about')).toBe(false)
    expect(resolvesToIndexHtml('/index.html.map')).toBe(false)
  })

  it('rejects a null-byte path', () => {
    expect(resolvesToIndexHtml('/%00index.html')).toBe(false)
  })
})
