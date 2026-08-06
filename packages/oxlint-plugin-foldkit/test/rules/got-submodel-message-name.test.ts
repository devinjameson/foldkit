import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import { gotSubmodelMessageName } from '../../src/rules/got-submodel-message-name.ts'

const m = (tag: string, fields?: unknown) =>
  Testing.callExpr(
    'm',
    fields === undefined
      ? [Testing.strLiteral(tag)]
      : [Testing.strLiteral(tag), fields],
  )

describe('got-submodel-message-name', () => {
  it('requires Message payload wrappers to use Got*Message names', () => {
    const result = Testing.runRule(
      gotSubmodelMessageName,
      'CallExpression',
      m('ReceivedChild', Testing.objectExpr([{ key: 'message' }])),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain(
      'reserved for Submodel wrappers',
    )
    expect(result[0]?.diagnostic.message).toContain('Got*Message')
    expect(result[0]?.diagnostic.message).toContain('rename the field')
  })

  it('allows Got*Message wrappers around Submodel Messages', () => {
    const result = Testing.runRule(
      gotSubmodelMessageName,
      'CallExpression',
      m(
        'GotChildMessage',
        Testing.objectExpr([
          { key: 'message', value: Testing.memberExpr('Child', 'Message') },
        ]),
      ),
    )

    expect(result).toHaveLength(0)
  })
})
