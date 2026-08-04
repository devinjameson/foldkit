import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import { noAppUpdateOrViewImportInPage } from '../../src/rules/no-app-update-or-view-import-in-page.ts'

const run = (filename: string, specifier: string) =>
  Testing.runRule(
    noAppUpdateOrViewImportInPage,
    'ImportDeclaration',
    Testing.importDecl(specifier),
    { filename },
  )

describe('no-app-update-or-view-import-in-page', () => {
  it('flags a page importing the app update', () => {
    const result = run('/app/src/page/cart/update.ts', '../../update')

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('update')
  })

  it('flags a page importing the app view barrel', () => {
    const result = run('/app/src/page/cart/view.ts', '../../view/index')

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('view')
  })

  it('flags a single file page importing the app view', () => {
    const result = run('/app/src/page/cart.ts', '../view')

    expect(result).toHaveLength(1)
  })

  it('allows a shared module inside the app view directory', () => {
    const result = run('/app/src/page/room/view/view.ts', '../../../view/icon')

    expect(result).toHaveLength(0)
  })

  it('allows the page importing its own update', () => {
    const result = run('/app/src/page/cart/index.ts', './update')

    expect(result).toHaveLength(0)
  })

  it('allows an app level import that is not update or view', () => {
    const result = run('/app/src/page/cart/model.ts', '../../route')

    expect(result).toHaveLength(0)
  })

  it('ignores a file outside any page container', () => {
    const result = run('/app/src/main.ts', './view')

    expect(result).toHaveLength(0)
  })

  it('ignores a bare package specifier', () => {
    const result = run('/app/src/page/cart/view.ts', 'foldkit/html')

    expect(result).toHaveLength(0)
  })
})
