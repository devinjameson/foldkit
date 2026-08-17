import { inertHtml as ih } from 'foldkit/html'
import { describe, expect, it } from 'vitest'

describe('view identity branding', () => {
  it('stamps vnodes returned from devtools source modules', () => {
    const panelView = () => ih.div([])

    const vnode = panelView()

    // The identity carries a digest of the module's source after the source
    // position, so a view whose implementation changes gets a new identity and
    // hydration rebuilds rather than adopting a stale page's element for it.
    expect(vnode?.identity).toMatch(
      /^src\/viewIdentity\.test\.ts#panelView@[0-9a-f]+$/,
    )
  })
})
