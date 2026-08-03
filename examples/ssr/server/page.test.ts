import { describe, expect, it } from 'vitest'

import { injectIntoTemplate } from './page'

const TEMPLATE =
  '<!doctype html><html lang="en"><head><title>old</title></head>' +
  '<body><div id="root"></div></body></html>'

describe('injectIntoTemplate', () => {
  it('injects the body and title', () => {
    const result = injectIntoTemplate(TEMPLATE, {
      html: '<div data-foldkit-app="app">hi</div>',
      title: 'New Title',
    })
    expect(result).toContain('<title>New Title</title>')
    expect(result).toContain(
      '<body><div data-foldkit-app="app">hi</div></body>',
    )
  })

  it('stamps lang and dir onto <html>, replacing the template lang', () => {
    const result = injectIntoTemplate(TEMPLATE, {
      html: '<div>x</div>',
      title: 't',
      lang: 'ar',
      dir: 'rtl',
    })
    expect(result).toContain('<html lang="ar" dir="rtl">')
    expect(result).not.toContain('lang="en"')
  })

  it('leaves <html> untouched when lang and dir are omitted', () => {
    const result = injectIntoTemplate(TEMPLATE, {
      html: '<div>x</div>',
      title: 't',
    })
    expect(result).toContain('<html lang="en">')
  })

  it('inserts a $ sequence in the body verbatim', () => {
    const result = injectIntoTemplate(TEMPLATE, {
      html: '<div>price $5 & rising $&amp; $`</div>',
      title: 't',
    })
    expect(result).toContain('<div>price $5 & rising $&amp; $`</div>')
  })
})
