import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import { noUpwardImportsInDomain } from '../../src/rules/no-upward-imports-in-domain.ts'

const run = (filename: string, specifier: string) =>
  Testing.runRule(
    noUpwardImportsInDomain,
    'ImportDeclaration',
    Testing.importDecl(specifier),
    { filename },
  )

describe('no-upward-imports-in-domain', () => {
  it('flags a domain module importing a page module', () => {
    const result = run('/app/src/domain/cart.ts', '../page/products/view')

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('page')
  })

  it('flags a domain module importing the app level update', () => {
    const result = run('/app/src/domain/cart.ts', '../update')

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('update')
  })

  it('flags the app level view barrel', () => {
    const result = run('/app/src/domain/cart.ts', '../view/index')

    expect(result).toHaveLength(1)
  })

  it('allows a sibling domain module', () => {
    const result = run('/app/src/domain/cart.ts', './item')

    expect(result).toHaveLength(0)
  })

  it('allows a shared app level module that is not a role', () => {
    const result = run('/app/src/domain/apple.ts', '../constants')

    expect(result).toHaveLength(0)
  })

  it('allows a module inside an app level role directory', () => {
    const result = run('/app/src/domain/cart.ts', '../view/icon')

    expect(result).toHaveLength(0)
  })

  it('flags an app level role reached from a nested domain file', () => {
    const result = run('/app/src/domain/cart/total.ts', '../../update')

    expect(result).toHaveLength(1)
  })

  it('allows a domain folder inside a page to reach around its own page', () => {
    const result = run('/app/src/page/room/domain/word.ts', '../model')

    expect(result).toHaveLength(0)
  })

  it('leaves a page nested domain folder reaching a sibling page to no-cross-page-imports', () => {
    const result = run('/app/src/page/room/domain/word.ts', '../../lobby/model')

    expect(result).toHaveLength(0)
  })

  it('flags a page nested domain folder importing its own page view', () => {
    const result = run('/app/src/page/room/domain/word.ts', '../view')

    expect(result).toHaveLength(1)
  })

  it('flags a domain module importing the page barrel', () => {
    const result = run('/app/src/domain/cart.ts', '../page')

    expect(result).toHaveLength(1)
  })

  it('ignores a file outside any domain directory', () => {
    const result = run('/app/src/update.ts', './page/cart/view')

    expect(result).toHaveLength(0)
  })

  it('ignores a bare package specifier', () => {
    const result = run('/app/src/domain/cart.ts', 'foldkit/struct')

    expect(result).toHaveLength(0)
  })

  it('reads Windows separators', () => {
    const result = run('C:\\app\\src\\domain\\cart.ts', '../page/products/view')

    expect(result).toHaveLength(1)
  })
})
