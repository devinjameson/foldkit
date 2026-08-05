import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import { runtimeBootOnlyInEntry } from '../../src/rules/runtime-boot-only-in-entry.ts'

const runtimeNamespaceImport = Testing.importDeclWithSpecifiers('foldkit', [
  Testing.importSpecifier('Runtime'),
])

const bootStatement = Testing.exprStmt(
  Testing.callOfMember('Runtime', 'run', [Testing.id('application')]),
)

const exportedView = Testing.exportNamedDecl(
  Testing.varDecl('const', 'view', Testing.arrowFn()),
)

const run = (filename: string, body: ReadonlyArray<unknown>) =>
  Testing.runRule(runtimeBootOnlyInEntry, 'Program', Testing.program(body), {
    filename,
  })

describe('runtime-boot-only-in-entry', () => {
  it('flags a module side effect boot in a module that exports bindings', () => {
    const result = run('/app/src/main.ts', [
      runtimeNamespaceImport,
      exportedView,
      bootStatement,
    ])

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('entry.ts')
  })

  it('allows a module that only builds an application and exports it', () => {
    const result = run('/app/src/main.ts', [
      runtimeNamespaceImport,
      Testing.exportNamedDecl(
        Testing.varDecl(
          'const',
          'application',
          Testing.callOfMember('Runtime', 'makeApplication', [
            Testing.objectExpr([{ key: 'Model' }, { key: 'init' }]),
          ]),
        ),
      ),
    ])

    expect(result).toHaveLength(0)
  })

  it('allows a boot inside a function the caller invokes', () => {
    const result = run('/app/src/host.ts', [
      runtimeNamespaceImport,
      Testing.exportNamedDecl(
        Testing.varDecl(
          'const',
          'startHost',
          Testing.arrowFn(Testing.blockStmt([bootStatement])),
        ),
      ),
    ])

    expect(result).toHaveLength(0)
  })

  it('allows a module that exports nothing to boot under another name', () => {
    const result = run('/app/src/client.ts', [
      runtimeNamespaceImport,
      bootStatement,
    ])

    expect(result).toHaveLength(0)
  })

  it('allows the entry module to boot', () => {
    const result = run('/app/src/entry.ts', [
      runtimeNamespaceImport,
      bootStatement,
    ])

    expect(result).toHaveLength(0)
  })

  it('flags an embed that mounts an element on import', () => {
    const result = run('/app/src/widget.ts', [
      runtimeNamespaceImport,
      exportedView,
      Testing.exprStmt(
        Testing.callOfMember('Runtime', 'embed', [Testing.id('element')]),
      ),
    ])

    expect(result).toHaveLength(1)
  })

  it('flags a boot whose result is bound to a module level name', () => {
    const result = run('/app/src/widget.ts', [
      runtimeNamespaceImport,
      Testing.exportNamedDecl(
        Testing.varDecl(
          'const',
          'handle',
          Testing.callOfMember('Runtime', 'embed', [Testing.id('element')]),
        ),
      ),
    ])

    expect(result).toHaveLength(1)
  })

  it('flags a boot function imported directly from the runtime module', () => {
    const result = run('/app/src/main.ts', [
      Testing.importDeclWithSpecifiers('foldkit/runtime', [
        Testing.importSpecifier('run'),
      ]),
      exportedView,
      Testing.exprStmt(Testing.callExpr('run', [Testing.id('application')])),
    ])

    expect(result).toHaveLength(1)
  })

  it('flags a renamed boot import', () => {
    const result = run('/app/src/main.ts', [
      Testing.importDeclWithSpecifiers('foldkit/runtime', [
        Testing.importSpecifier('run', 'boot'),
      ]),
      exportedView,
      Testing.exprStmt(Testing.callExpr('boot', [Testing.id('application')])),
    ])

    expect(result).toHaveLength(1)
  })

  it('flags a namespace import of the runtime module', () => {
    const result = run('/app/src/main.ts', [
      Testing.importDeclWithSpecifiers('foldkit/runtime', [
        Testing.importNamespaceSpecifier('FoldkitRuntime'),
      ]),
      exportedView,
      Testing.exprStmt(
        Testing.callOfMember('FoldkitRuntime', 'run', [
          Testing.id('application'),
        ]),
      ),
    ])

    expect(result).toHaveLength(1)
  })

  it('ignores a run call that does not come from foldkit', () => {
    const result = run('/app/src/main.ts', [
      Testing.importDeclWithSpecifiers('./scheduler', [
        Testing.importSpecifier('run'),
      ]),
      exportedView,
      Testing.exprStmt(Testing.callExpr('run', [Testing.id('job')])),
    ])

    expect(result).toHaveLength(0)
  })

  it('ignores a documentation snippet that elides its imports', () => {
    const result = run('/app/src/snippet/counterEntry.ts', [
      exportedView,
      bootStatement,
    ])

    expect(result).toHaveLength(0)
  })

  it('ignores a type only import of the Runtime namespace', () => {
    const result = run('/app/src/main.ts', [
      Testing.importDeclWithSpecifiers(
        'foldkit',
        [Testing.importSpecifier('Runtime')],
        'type',
      ),
      exportedView,
      bootStatement,
    ])

    expect(result).toHaveLength(0)
  })

  it('ignores a module whose only exports are types', () => {
    const result = run('/app/src/model.ts', [
      runtimeNamespaceImport,
      { type: 'ExportNamedDeclaration', exportKind: 'type', declaration: null },
      bootStatement,
    ])

    expect(result).toHaveLength(0)
  })

  it('reads Windows separators', () => {
    const result = run('C:\\app\\src\\entry.ts', [
      runtimeNamespaceImport,
      exportedView,
      bootStatement,
    ])

    expect(result).toHaveLength(0)
  })
})
