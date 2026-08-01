import { inertHtml as ih } from 'foldkit/html'
import { describe, expect, it } from 'vitest'

describe('view identity branding', () => {
  it('stamps vnodes returned from devtools source modules', () => {
    const panelView = () => ih.div([])

    const vnode = panelView()

    expect(vnode?.identity).toBe('src/viewIdentity.test.ts#panelView')
  })
})
