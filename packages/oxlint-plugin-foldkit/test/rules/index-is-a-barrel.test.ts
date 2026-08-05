import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import { indexIsABarrel } from '../../src/rules/index-is-a-barrel.ts'

const BARREL = '/app/src/page/apiReference/index.ts'

const reExportAll = (source: string) => ({
  type: 'ExportAllDeclaration',
  exported: null,
  source: Testing.strLiteral(source),
})

const reExportAllAs = (exported: string, source: string) => ({
  type: 'ExportAllDeclaration',
  exported: Testing.id(exported),
  source: Testing.strLiteral(source),
})

const reExportNamed = (source: string, exportKind = 'value') => ({
  type: 'ExportNamedDeclaration',
  declaration: null,
  specifiers: [],
  source: Testing.strLiteral(source),
  exportKind,
})

const constDeclaration = (name: string) => ({
  type: 'VariableDeclaration',
  kind: 'const',
  declare: false,
  declarations: [
    { type: 'VariableDeclarator', id: Testing.id(name), init: null },
  ],
})

const exported = (declaration: unknown) => ({
  type: 'ExportNamedDeclaration',
  declaration,
  specifiers: [],
  source: null,
})

const run = (body: ReadonlyArray<unknown>, filename = BARREL) =>
  Testing.runRule(indexIsABarrel, 'Program', Testing.program(body), {
    filename,
  })

describe('index-is-a-barrel', () => {
  it('flags a value declaration beside the re-exports', () => {
    const result = run([
      reExportAll('./domain'),
      constDeclaration('resolveModule'),
    ])

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('resolveModule')
  })

  it('allows a barrel of nothing but re-exports', () => {
    const result = run([
      reExportAll('./model'),
      reExportNamed('./message'),
      reExportAllAs('Entry', './entry'),
    ])

    expect(result).toHaveLength(0)
  })

  it('names the sibling file the convention asks for', () => {
    const result = run([reExportAll('./domain'), constDeclaration('helper')])

    expect(result[0]?.diagnostic.message).toContain(
      'apiReference/apiReference.ts',
    )
  })

  it('drops the sibling file suggestion at a source root', () => {
    const result = run(
      [reExportAll('./page'), constDeclaration('helper')],
      '/app/src/index.ts',
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).not.toContain('src/src.ts')
  })

  it('allows a type alias and an interface beside the re-exports', () => {
    const result = run([
      reExportAll('./model'),
      { type: 'TSTypeAliasDeclaration', id: Testing.id('Disclosures') },
      exported({
        type: 'TSInterfaceDeclaration',
        id: Testing.id('ViewInputs'),
      }),
    ])

    expect(result).toHaveLength(0)
  })

  it('flags a function declaration and a top level statement', () => {
    const result = run([
      reExportNamed('./model'),
      { type: 'FunctionDeclaration', id: Testing.id('toSlug') },
      Testing.exprStmt(Testing.callExpr('register')),
    ])

    expect(result).toHaveLength(2)
    expect(result[0]?.diagnostic.message).toContain('toSlug')
    expect(result[1]?.diagnostic.message).toContain('runs code of its own')
  })

  it('allows an ambient declare beside the re-exports', () => {
    const result = run([
      reExportAll('./model'),
      {
        type: 'VariableDeclaration',
        kind: 'const',
        declare: true,
        declarations: [
          { type: 'VariableDeclarator', id: Testing.id('__DEV__'), init: null },
        ],
      },
    ])

    expect(result).toHaveLength(0)
  })

  it('leaves an index file that re-exports nothing alone', () => {
    const result = run(
      [Testing.importDecl('./copy'), constDeclaration('Icon')],
      '/app/src/icon/index.ts',
    )

    expect(result).toHaveLength(0)
  })

  it('leaves an index file whose only re-export is type only alone', () => {
    const result = run(
      [reExportNamed('./schema', 'type'), constDeclaration('view')],
      '/app/src/animation/index.ts',
    )

    expect(result).toHaveLength(0)
  })

  it('leaves an index file whose re-export names only types alone', () => {
    const result = run(
      [
        {
          type: 'ExportNamedDeclaration',
          declaration: null,
          source: Testing.strLiteral('./schema'),
          exportKind: 'value',
          specifiers: [
            { type: 'ExportSpecifier', exportKind: 'type' },
            { type: 'ExportSpecifier', exportKind: 'type' },
          ],
        },
        constDeclaration('view'),
      ],
      '/app/src/animation/index.ts',
    )

    expect(result).toHaveLength(0)
  })

  it('ignores a named module file', () => {
    const result = run(
      [reExportAll('./domain'), constDeclaration('resolveModule')],
      '/app/src/page/apiReference/apiReference.ts',
    )

    expect(result).toHaveLength(0)
  })

  it('reads an index.tsx barrel', () => {
    const result = run(
      [reExportAll('./domain'), constDeclaration('resolveModule')],
      '/app/src/page/apiReference/index.tsx',
    )

    expect(result).toHaveLength(1)
  })

  it('reads Windows separators', () => {
    const result = run(
      [reExportAll('./domain'), constDeclaration('resolveModule')],
      'C:\\app\\src\\page\\apiReference\\index.ts',
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain(
      'apiReference/apiReference.ts',
    )
  })
})
