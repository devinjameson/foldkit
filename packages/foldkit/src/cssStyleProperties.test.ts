/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { CSS_STYLE_PROPERTIES } from './cssStyleProperties.js'

const require = createRequire(import.meta.url)

describe('CSS_STYLE_PROPERTIES', () => {
  it('matches the pinned TypeScript CSSStyleProperties interface', () => {
    const typescriptEntry = require.resolve('typescript')
    const libDom = readFileSync(
      join(dirname(typescriptEntry), 'lib.dom.d.ts'),
      'utf8',
    )
    const interfaceMatch =
      /interface CSSStyleProperties[^\{]*\{([\s\S]*?)\n\}/.exec(libDom)
    if (interfaceMatch === null) {
      throw new Error('TypeScript lib.dom.d.ts has no CSSStyleProperties')
    }
    const interfaceBody = interfaceMatch.at(1)
    if (interfaceBody === undefined) {
      throw new Error('TypeScript CSSStyleProperties has no body')
    }
    const propertyNames = Array.from(
      interfaceBody.matchAll(/^\s+([A-Za-z_$][\w$]*): string;$/gm),
      match => {
        const name = match.at(1)
        if (name === undefined) {
          throw new Error('CSSStyleProperties member has no name')
        }
        return name
      },
    )

    expect(Array.from(CSS_STYLE_PROPERTIES).sort()).toEqual(
      propertyNames.sort(),
    )
  })
})
