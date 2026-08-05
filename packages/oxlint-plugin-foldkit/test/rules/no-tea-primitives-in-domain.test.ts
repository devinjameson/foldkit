import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import { noTeaPrimitivesInDomain } from '../../src/rules/no-tea-primitives-in-domain.ts'

const DOMAIN_FILE = '/app/src/domain/cart.ts'

const run = (filename: string, node: unknown) =>
  Testing.runRule(noTeaPrimitivesInDomain, 'CallExpression', node, { filename })

describe('no-tea-primitives-in-domain', () => {
  it('flags an m() Message constructor', () => {
    const result = run(
      DOMAIN_FILE,
      Testing.callExpr('m', [Testing.strLiteral('ItemAdded')]),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('Message')
  })

  it('flags a Command.define', () => {
    const result = run(
      DOMAIN_FILE,
      Testing.callOfMember('Command', 'define', [
        Testing.strLiteral('LoadItems'),
      ]),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('Command')
  })

  it('flags a Subscription declaration', () => {
    const result = run(
      DOMAIN_FILE,
      Testing.callOfMember('Subscription', 'make'),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('Subscription')
  })

  it('allows Schema, which is the point of a domain module', () => {
    const result = run(DOMAIN_FILE, Testing.callOfMember('Schema', 'Struct'))

    expect(result).toHaveLength(0)
  })

  it('allows ordinary pure helpers named like element builders', () => {
    const result = run(DOMAIN_FILE, Testing.callOfMember('Array', 'map'))

    expect(result).toHaveLength(0)
  })

  it('flags view markup built with an html builder', () => {
    const result = run(DOMAIN_FILE, Testing.callOfMember('h', 'div'))

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('view')
  })

  it('flags view markup built with the inert html builder', () => {
    const result = run(DOMAIN_FILE, Testing.callOfMember('ih', 'span'))

    expect(result).toHaveLength(1)
  })

  it('ignores a file outside any domain directory', () => {
    const result = run(
      '/app/src/page/cart/update.ts',
      Testing.callExpr('m', [Testing.strLiteral('ItemAdded')]),
    )

    expect(result).toHaveLength(0)
  })
})
