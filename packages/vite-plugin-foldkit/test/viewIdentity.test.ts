import { parseAst } from 'vite'
import { describe, expect, it } from 'vitest'

import { moduleDigest, transformViewIdentity } from '../src/viewIdentity.ts'

const MODULE_ID = '/app/src/View.ts'
const ROOT = '/app'
// A fixed digest keeps the identity assertions readable. The plugin mixes a
// digest of the module's own source into every identity it defines, so an edit
// to a view's implementation gives it a new identity and hydration rebuilds
// rather than adopting a stale page's element for it.
const DIGEST = 'testdigest00'
const ALIAS = '__foldkitBrandViewResult'
const IMPORT_LINE = `import { brandViewResult as ${ALIAS} } from 'foldkit/brand'`

const requireTransform = (code: string, id: string = MODULE_ID) => {
  const result = transformViewIdentity(code, id, ROOT, {
    sourceDigest: DIGEST,
  })
  expect(result).not.toBeNull()
  if (result === null) {
    throw new Error('expected a transform result')
  }
  return result
}

const countOccurrences = (haystack: string, needle: string): number =>
  haystack.split(needle).length - 1

describe('function naming', () => {
  it('brands returns of a named function declaration', () => {
    const result = requireTransform(`function view() {
  return 1
}
`)
    expect(result.code).toContain(
      `return ${ALIAS}((1), "src/View.ts#view@${DIGEST}")`,
    )
  })

  it('brands returns of a const arrow with a block body', () => {
    const result = requireTransform(`const view = () => {
  return 1
}
`)
    expect(result.code).toContain(
      `return ${ALIAS}((1), "src/View.ts#view@${DIGEST}")`,
    )
  })

  it('wraps the body of an expression-body arrow', () => {
    const result = requireTransform(`const view = () => 1
`)
    expect(result.code).toContain(
      `const view = () => ${ALIAS}((1), "src/View.ts#view@${DIGEST}")`,
    )
  })

  it('names an object method by its key', () => {
    const result = requireTransform(`const views = {
  render() {
    return 1
  },
}
`)
    expect(result.code).toContain(
      `return ${ALIAS}((1), "src/View.ts#render@${DIGEST}")`,
    )
  })

  it('names an object property arrow by its key', () => {
    const result = requireTransform(`const handlers = {
  Viewing: () => 1,
}
`)
    expect(result.code).toContain(
      `Viewing: () => ${ALIAS}((1), "src/View.ts#Viewing@${DIGEST}")`,
    )
  })

  it('names a class method by its key', () => {
    const result = requireTransform(`class Panel {
  render() {
    return 1
  }
}
`)
    expect(result.code).toContain(
      `return ${ALIAS}((1), "src/View.ts#render@${DIGEST}")`,
    )
  })

  it('names an export-default function "default"', () => {
    const result = requireTransform(`export default function () {
  return 1
}
`)
    expect(result.code).toContain(
      `return ${ALIAS}((1), "src/View.ts#default@${DIGEST}")`,
    )
  })

  it('names an export-default arrow "default"', () => {
    const result = requireTransform(`export default () => 1
`)
    expect(result.code).toContain(
      `export default () => ${ALIAS}((1), "src/View.ts#default@${DIGEST}")`,
    )
  })

  it('names a member assignment by its property', () => {
    const result = requireTransform(`const host = {}
host.render = function () {
  return 1
}
`)
    expect(result.code).toContain(
      `return ${ALIAS}((1), "src/View.ts#render@${DIGEST}")`,
    )
  })

  it('falls back to "anonymous" for unnameable functions', () => {
    const result = requireTransform(`const views = [() => 1]
`)
    expect(result.code).toContain(
      `${ALIAS}((1), "src/View.ts#anonymous@${DIGEST}")`,
    )
  })
})

describe('nested functions', () => {
  it('brands inner and outer functions with their own ids', () => {
    const result = requireTransform(`const outer = () => {
  const inner = () => 1
  return inner()
}
`)
    expect(result.code).toContain(
      `const inner = () => ${ALIAS}((1), "src/View.ts#inner@${DIGEST}")`,
    )
    expect(result.code).toContain(
      `return ${ALIAS}((inner()), "src/View.ts#outer@${DIGEST}")`,
    )
    expect(countOccurrences(result.code, `${ALIAS}((`)).toBe(2)
  })

  it('does not let an outer function wrap returns of a nested function', () => {
    const result = requireTransform(`function outer() {
  return function inner() {
    return 1
  }
}
`)
    expect(countOccurrences(result.code, `"src/View.ts#outer@${DIGEST}"`)).toBe(
      1,
    )
    expect(countOccurrences(result.code, `"src/View.ts#inner@${DIGEST}"`)).toBe(
      1,
    )
  })

  it('nests calls correctly when inner and outer targets share an end', () => {
    const result = requireTransform(`const outer = () => () => 1
`)
    expect(result.code).toContain(
      `${ALIAS}((() => ${ALIAS}((1), "src/View.ts#anonymous@${DIGEST}")), "src/View.ts#outer@${DIGEST}")`,
    )
    expect(() => parseAst(result.code)).not.toThrow()
  })
})

describe('duplicate names', () => {
  it('disambiguates duplicate names deterministically in source order', () => {
    const result = requireTransform(`const render = () => 1
const panel = { render: () => 2 }
`)
    expect(result.code).toContain(
      `const render = () => ${ALIAS}((1), "src/View.ts#render@${DIGEST}")`,
    )
    expect(result.code).toContain(
      `render: () => ${ALIAS}((2), "src/View.ts#render~2@${DIGEST}")`,
    )
  })
})

describe('returns and imports', () => {
  it('leaves bare return statements untouched', () => {
    expect(
      transformViewIdentity(
        `function run() {
  return
}
`,
        MODULE_ID,
        ROOT,
      ),
    ).toBeNull()
  })

  it('returns null for a module with no functions', () => {
    expect(
      transformViewIdentity('const value = 1\n', MODULE_ID, ROOT),
    ).toBeNull()
  })

  it('injects the brand import exactly once', () => {
    const result = requireTransform(`const first = () => 1
const second = () => 2
const third = () => 3
`)
    expect(result.code.startsWith(IMPORT_LINE)).toBe(true)
    expect(countOccurrences(result.code, "from 'foldkit/brand'")).toBe(1)
  })

  it('extends the alias with a numeric suffix on collision', () => {
    const result = requireTransform(`const ${ALIAS} = 1
const view = () => 2
`)
    expect(result.code).toContain(
      `import { brandViewResult as ${ALIAS}2 } from 'foldkit/brand'`,
    )
    expect(result.code).toContain(
      `const view = () => ${ALIAS}2((2), "src/View.ts#view@${DIGEST}")`,
    )
  })

  it('keeps a parenthesized object-body arrow syntactically valid', () => {
    const result = requireTransform(`const view = () => ({ label: 'x' })
`)
    expect(result.code).toContain(ALIAS)
    expect(() => parseAst(result.code)).not.toThrow()
  })
})

describe('eligibility', () => {
  const FUNCTION_SOURCE = 'const view = () => 1\n'

  it('skips a packages/foldkit path via the fallback when foldkit is unresolved', () => {
    expect(
      transformViewIdentity(
        FUNCTION_SOURCE,
        '/app/packages/foldkit/src/html/index.ts',
        ROOT,
      ),
    ).toBeNull()
  })

  it('brands a consumer module under packages/foldkit once foldkit resolves', () => {
    // Regression: with the installed foldkit package resolved, the plugin's
    // precise package-root gate is authoritative, so the coarse
    // `packages/foldkit/` fragment must not un-brand a consumer whose own app
    // path merely contains the segment.
    const result = transformViewIdentity(
      FUNCTION_SOURCE,
      '/work/app/packages/foldkit/View.ts',
      '/work/app',
      { isFoldkitCoreResolved: true, sourceDigest: DIGEST },
    )
    expect(result).not.toBeNull()
    expect(result?.code).toContain(`"packages/foldkit/View.ts#view@${DIGEST}"`)
  })

  it('skips foldkit core under node_modules', () => {
    expect(
      transformViewIdentity(
        FUNCTION_SOURCE,
        '/app/node_modules/foldkit/dist/index.js',
        ROOT,
      ),
    ).toBeNull()
  })

  it('does not skip @foldkit/ui modules', () => {
    const result = requireTransform(
      FUNCTION_SOURCE,
      '/app/packages/ui/src/button/button.ts',
    )
    expect(result.code).toContain(
      `"packages/ui/src/button/button.ts#view@${DIGEST}"`,
    )
  })

  it('skips virtual modules', () => {
    expect(
      transformViewIdentity(FUNCTION_SOURCE, '\0virtual:module', ROOT),
    ).toBeNull()
  })

  it('skips non-script extensions', () => {
    expect(
      transformViewIdentity(FUNCTION_SOURCE, '/app/src/styles.css', ROOT),
    ).toBeNull()
  })

  it('strips the query before checking the extension', () => {
    const result = requireTransform(FUNCTION_SOURCE, '/app/src/View.ts?v=123')
    expect(result.code).toContain(`"src/View.ts#view@${DIGEST}"`)
  })

  it('skips only whole node_modules path segments', () => {
    expect(
      transformViewIdentity(
        FUNCTION_SOURCE,
        '/app/node_modules/some-lib/view.ts',
        ROOT,
      ),
    ).toBeNull()

    const result = requireTransform(
      FUNCTION_SOURCE,
      '/app/src/node_modules-demo.ts',
    )
    expect(result.code).toContain(`"src/node_modules-demo.ts#view@${DIGEST}"`)
  })
})

describe('already-branded modules', () => {
  it('returns null when the module already imports foldkit/brand', () => {
    const brandedSource = `${IMPORT_LINE}
const view = () => ${ALIAS}((1), "src/View.ts#view@${DIGEST}")
`
    expect(transformViewIdentity(brandedSource, MODULE_ID, ROOT)).toBeNull()
  })

  it('recognizes a double-quoted foldkit/brand specifier', () => {
    const brandedSource = `import { brandViewResult } from "foldkit/brand"
const view = () => brandViewResult(1, "src/View.ts#view@${DIGEST}")
`
    expect(transformViewIdentity(brandedSource, MODULE_ID, ROOT)).toBeNull()
  })

  it('is idempotent: transforming its own output returns null', () => {
    const first = requireTransform('const view = () => 1\n')
    expect(transformViewIdentity(first.code, MODULE_ID, ROOT)).toBeNull()
  })

  it('skips a module that re-exports foldkit/brand', () => {
    const reexportSource = `export { brandViewResult } from 'foldkit/brand'
const view = () => 1
`
    expect(transformViewIdentity(reexportSource, MODULE_ID, ROOT)).toBeNull()
  })

  it('brands a module whose comment mentions foldkit/brand', () => {
    const result = requireTransform(`// see 'foldkit/brand' for details
const view = () => 1
`)
    expect(result.code).toContain(`${ALIAS}((1), "src/View.ts#view@${DIGEST}")`)
    expect(countOccurrences(result.code, "from 'foldkit/brand'")).toBe(1)
  })

  it('brands a module whose string literal mentions foldkit/brand', () => {
    const result = requireTransform(`const specifier = 'foldkit/brand'
const view = () => 1
`)
    expect(result.code).toContain(`${ALIAS}((1), "src/View.ts#view@${DIGEST}")`)
  })
})

describe('directive prologues', () => {
  it('keeps leading directives ahead of the injected import', () => {
    const result = requireTransform(`'use client'
'use strict'
const view = () => 1
`)
    const directiveIndex = result.code.indexOf(`'use client'`)
    const strictIndex = result.code.indexOf(`'use strict'`)
    const importIndex = result.code.indexOf(IMPORT_LINE)
    expect(directiveIndex).toBe(0)
    expect(strictIndex).toBeGreaterThan(directiveIndex)
    expect(importIndex).toBeGreaterThan(strictIndex)
    expect(countOccurrences(result.code, IMPORT_LINE)).toBe(1)
    expect(() => parseAst(result.code)).not.toThrow()
  })

  it('keeps a leading hashbang and its directives ahead of the injected import', () => {
    const result = requireTransform(`#!/usr/bin/env node
'use strict'
const view = () => 1
`)
    const hashbangIndex = result.code.indexOf('#!/usr/bin/env node')
    const strictIndex = result.code.indexOf(`'use strict'`)
    const importIndex = result.code.indexOf(IMPORT_LINE)
    expect(hashbangIndex).toBe(0)
    expect(strictIndex).toBeGreaterThan(hashbangIndex)
    expect(importIndex).toBeGreaterThan(strictIndex)
    expect(result.code).toContain(`${ALIAS}((1), "src/View.ts#view@${DIGEST}")`)
    expect(() => parseAst(result.code)).not.toThrow()
  })

  it('inserts after a hashbang when no directives follow', () => {
    const result = requireTransform(`#!/usr/bin/env node
const view = () => 1
`)
    const hashbangIndex = result.code.indexOf('#!/usr/bin/env node')
    const importIndex = result.code.indexOf(IMPORT_LINE)
    expect(hashbangIndex).toBe(0)
    expect(importIndex).toBeGreaterThan(hashbangIndex)
    expect(() => parseAst(result.code)).not.toThrow()
  })
})

describe('output stability', () => {
  it('produces identical output across runs', () => {
    const source = `const view = () => 1
const panel = () => {
  return 2
}
`
    const first = requireTransform(source)
    const second = requireTransform(source)
    expect(first.code).toBe(second.code)
  })

  it('produces a source map', () => {
    const result = requireTransform('const view = () => 1\n')
    expect(result.map.mappings.length).toBeGreaterThan(0)
  })
})

describe('build skew', () => {
  const VIEW_SOURCE = `export const field = () => h.input([h.Name('email')])\n`
  const CHANGED_VIEW_SOURCE = `export const field = () => h.input([h.Name('ssn')])\n`

  const identityOf = (source: string): string => {
    const result = transformViewIdentity(source, MODULE_ID, ROOT, {
      sourceDigest: moduleDigest(source),
    })
    if (result === null) {
      throw new Error('expected a transform result')
    }
    const match = /"(src\/View\.ts#[^"]+)"/.exec(result.code)
    if (match?.[1] === undefined) {
      throw new Error(`no identity found in ${result.code}`)
    }
    return match[1]
  }

  it('gives a view a new identity when its implementation changes', () => {
    // A stale page's `<input name="email">` and a new build's
    // `<input name="ssn">` come from the same source position, so an identity
    // that named only the position would let hydration adopt the served input
    // for the new one and carry the value the visitor typed into a field that
    // means something else. The identity has to move when the code does.
    expect(identityOf(VIEW_SOURCE)).not.toBe(identityOf(CHANGED_VIEW_SOURCE))
  })

  it('gives a view the same identity across builds of one revision', () => {
    // The client bundle and the server bundle are separate builds of the same
    // file. If their identities disagreed, every hydration would rebuild the
    // page, so the digest has to be a function of the source alone.
    expect(identityOf(VIEW_SOURCE)).toBe(identityOf(VIEW_SOURCE))
  })

  it('keeps the source position readable in the identity', () => {
    expect(identityOf(VIEW_SOURCE)).toMatch(/^src\/View\.ts#field@[0-9a-f]+$/)
  })
})
