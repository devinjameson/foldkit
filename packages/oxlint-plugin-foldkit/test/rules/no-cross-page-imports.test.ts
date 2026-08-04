import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import { noCrossPageImports } from '../../src/rules/no-cross-page-imports.ts'

const run = (filename: string, specifier: string) =>
  Testing.runRule(
    noCrossPageImports,
    'ImportDeclaration',
    Testing.importDecl(specifier),
    { filename },
  )

describe('no-cross-page-imports', () => {
  it('flags a page importing a sibling page module', () => {
    const result = run('/app/src/page/cart/view.ts', '../products/model')

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('cart')
    expect(result[0]?.diagnostic.message).toContain('products')
  })

  it('flags a page importing the page barrel', () => {
    const result = run('/app/src/page/cart/view.ts', '../index')

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('barrel')
  })

  it('flags a sibling import from a nested page container', () => {
    const result = run(
      '/app/src/page/loggedIn/page/dashboard.ts',
      '../../loggedOut/view',
    )

    expect(result).toHaveLength(1)
  })

  it('allows an import from a subfolder of the same page', () => {
    const result = run('/app/src/page/room/view/playing.ts', '../../model')

    expect(result).toHaveLength(0)
  })

  it('allows an app level import', () => {
    const result = run('/app/src/page/room/init.ts', '../../route')

    expect(result).toHaveLength(0)
  })

  it('allows a single name in the page container, which may be a helper', () => {
    const result = run('/app/src/page/core/submodel.ts', '../demoView')

    expect(result).toHaveLength(0)
  })

  it('ignores a file sitting directly in the page container', () => {
    const result = run('/app/src/page/cart.ts', './products/model')

    expect(result).toHaveLength(0)
  })

  it('ignores a file outside any page container', () => {
    const result = run('/app/src/update.ts', './page/cart/model')

    expect(result).toHaveLength(0)
  })

  it('ignores a bare package specifier', () => {
    const result = run('/app/src/page/cart/view.ts', '@foldkit/ui')

    expect(result).toHaveLength(0)
  })

  it('reads Windows separators', () => {
    const result = run('C:\\app\\src\\page\\cart\\view.ts', '../products/model')

    expect(result).toHaveLength(1)
  })
})
