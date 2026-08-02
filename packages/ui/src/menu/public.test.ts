import { describe, expect, it } from 'vitest'

import { type Created, create } from './public.js'

type Action = 'Edit' | 'Delete'

describe('Menu public API', () => {
  it('exposes a nameable typed create result', () => {
    const actionMenu: Created<Action> = create<Action>()

    expect(actionMenu.view).toBeTypeOf('function')
    expect(actionMenu.update).toBeTypeOf('function')
  })
})
