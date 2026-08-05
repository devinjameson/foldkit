import * as Testing from 'effect-oxlint/testing'
import { describe, expect, it } from 'vitest'

import { primitivesDeclaredInRoleFiles } from '../../src/rules/primitives-declared-in-role-files.ts'

const runCall = (filename: string, node: unknown) =>
  Testing.runRule(primitivesDeclaredInRoleFiles, 'CallExpression', node, {
    filename,
  })

const messageCall = () => Testing.callExpr('m', [Testing.strLiteral('Clicked')])

describe('primitives-declared-in-role-files', () => {
  it('flags a Message constructor declared in view.ts', () => {
    const result = runCall('/app/src/page/cart/view.ts', messageCall())

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('message.ts')
  })

  it('flags a Command declared in view.ts', () => {
    const result = runCall(
      '/app/src/page/cart/view.ts',
      Testing.callOfMember('Command', 'define', [
        Testing.strLiteral('FetchAll'),
      ]),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('command.ts')
  })

  it('allows a Command declared beside the update that returns it', () => {
    const result = runCall(
      '/app/src/update.ts',
      Testing.callOfMember('Command', 'define', [
        Testing.strLiteral('NavigateInternal'),
      ]),
    )

    expect(result).toHaveLength(0)
  })

  it('flags a Subscription declared in update.ts', () => {
    const result = runCall(
      '/app/src/update.ts',
      Testing.callOfMember('Subscription', 'make'),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('subscription.ts')
  })

  it('allows Subscriptions to be composed outside a subscription module', () => {
    const result = runCall(
      '/app/src/page/cart/update.ts',
      Testing.callOfMember('Subscription', 'batch'),
    )

    expect(result).toHaveLength(0)
  })

  it('reads a role claimed by the containing folder', () => {
    const result = runCall(
      '/app/src/page/room/update/handleRoomUpdates.ts',
      messageCall(),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.diagnostic.message).toContain('`update`')
  })

  it('reads the file name ahead of the folder', () => {
    const result = runCall('/app/src/view/message.ts', messageCall())

    expect(result).toHaveLength(0)
  })

  it('ignores a single file app that keeps everything in main.ts', () => {
    const result = runCall('/app/src/main.ts', messageCall())

    expect(result).toHaveLength(0)
  })

  it('ignores a submodel that owns every part of itself in one file', () => {
    const result = runCall('/app/src/counter.ts', messageCall())

    expect(result).toHaveLength(0)
  })

  it('ignores a single file page', () => {
    const result = runCall('/app/src/page/landing.ts', messageCall())

    expect(result).toHaveLength(0)
  })

  it('ignores a module nested below a role folder', () => {
    const result = runCall('/app/src/view/part/button.ts', messageCall())

    expect(result).toHaveLength(0)
  })

  it('ignores a test module named for a role', () => {
    const result = runCall('/app/src/page/cart/update.test.ts', messageCall())

    expect(result).toHaveLength(0)
  })

  it('ignores a story test beside a role file', () => {
    const result = runCall('/app/src/page/cart/story.test.ts', messageCall())

    expect(result).toHaveLength(0)
  })

  it('reads Windows separators', () => {
    const result = runCall('C:\\app\\src\\page\\cart\\view.ts', messageCall())

    expect(result).toHaveLength(1)
  })
})
