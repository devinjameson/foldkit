import { RuleTester } from 'eslint'
import { describe, it } from 'vitest'

import rule from './top-level-lazy'

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
})

describe('top-level-lazy', () => {
  it('passes valid cases and catches violations', () => {
    ruleTester.run('top-level-lazy', rule, {
      valid: [
        {
          name: 'createLazy at module top level',
          code: `
            import { createLazy } from 'foldkit/html'
            const lazy = createLazy()
          `,
        },
        {
          name: 'createKeyedLazy at module top level',
          code: `
            import { createKeyedLazy } from 'foldkit/html'
            const lazy = createKeyedLazy()
          `,
        },
        {
          name: 'both at module top level',
          code: `
            import { createLazy, createKeyedLazy } from 'foldkit/html'
            const lazy = createLazy()
            const keyedLazy = createKeyedLazy()
          `,
        },
        {
          name: 'namespace import from foldkit/html',
          code: `
            import * as Html from 'foldkit/html'
            const lazy = Html.createLazy()
          `,
        },
        {
          name: 'namespace import from foldkit',
          code: `
            import { Html } from 'foldkit'
            const lazy = Html.createLazy()
            const keyedLazy = Html.createKeyedLazy()
          `,
        },
        {
          name: 'aliased import at top level',
          code: `
            import { createLazy as myLazy } from 'foldkit/html'
            const lazy = myLazy()
          `,
        },
        {
          name: 'unrelated function with same name from different module',
          code: `
            import { createLazy } from 'other-library'
            function view() {
              const lazy = createLazy()
            }
          `,
        },
        {
          name: 'unrelated createLazy not imported from foldkit',
          code: `
            function createLazy() { return () => {} }
            function view() {
              const lazy = createLazy()
            }
          `,
        },
      ],

      invalid: [
        {
          name: 'createLazy inside a function declaration',
          code: `
            import { createLazy } from 'foldkit/html'
            function view() {
              const lazy = createLazy()
            }
          `,
          errors: [{ messageId: 'notTopLevel', data: { name: 'createLazy' } }],
        },
        {
          name: 'createKeyedLazy inside a function declaration',
          code: `
            import { createKeyedLazy } from 'foldkit/html'
            function view() {
              const lazy = createKeyedLazy()
            }
          `,
          errors: [
            { messageId: 'notTopLevel', data: { name: 'createKeyedLazy' } },
          ],
        },
        {
          name: 'createLazy inside an arrow function',
          code: `
            import { createLazy } from 'foldkit/html'
            const view = () => {
              const lazy = createLazy()
            }
          `,
          errors: [{ messageId: 'notTopLevel', data: { name: 'createLazy' } }],
        },
        {
          name: 'createLazy inside a function expression',
          code: `
            import { createLazy } from 'foldkit/html'
            const view = function() {
              const lazy = createLazy()
            }
          `,
          errors: [{ messageId: 'notTopLevel', data: { name: 'createLazy' } }],
        },
        {
          name: 'createLazy nested inside multiple functions',
          code: `
            import { createLazy } from 'foldkit/html'
            function outer() {
              function inner() {
                const lazy = createLazy()
              }
            }
          `,
          errors: [{ messageId: 'notTopLevel', data: { name: 'createLazy' } }],
        },
        {
          name: 'namespace import inside a function',
          code: `
            import * as Html from 'foldkit/html'
            function view() {
              const lazy = Html.createLazy()
            }
          `,
          errors: [{ messageId: 'notTopLevel', data: { name: 'createLazy' } }],
        },
        {
          name: 'foldkit namespace import inside a function',
          code: `
            import { Html } from 'foldkit'
            const view = () => {
              const lazy = Html.createKeyedLazy()
            }
          `,
          errors: [
            { messageId: 'notTopLevel', data: { name: 'createKeyedLazy' } },
          ],
        },
        {
          name: 'aliased import inside a function',
          code: `
            import { createLazy as myLazy } from 'foldkit/html'
            function view() {
              const lazy = myLazy()
            }
          `,
          errors: [{ messageId: 'notTopLevel', data: { name: 'myLazy' } }],
        },
        {
          name: 'multiple violations in one file',
          code: `
            import { createLazy, createKeyedLazy } from 'foldkit/html'
            function viewA() {
              const lazy = createLazy()
            }
            const viewB = () => {
              const keyedLazy = createKeyedLazy()
            }
          `,
          errors: [
            { messageId: 'notTopLevel', data: { name: 'createLazy' } },
            { messageId: 'notTopLevel', data: { name: 'createKeyedLazy' } },
          ],
        },
      ],
    })
  })
})
