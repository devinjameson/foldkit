import { describe, expect, test } from 'vitest'

import { dedentDiagram } from './diagram'

describe('dedentDiagram', () => {
  test('removes the left margin every line shares', () => {
    const content = [
      '      Model',
      '        |',
      '        v',
      '     update',
    ].join('\n')

    expect(dedentDiagram(content)).toBe(
      [' Model', '   |', '   v', 'update'].join('\n'),
    )
  })

  test('leaves a diagram that already starts at the left edge untouched', () => {
    const content = ['Model', '  |', '  v', 'update'].join('\n')

    expect(dedentDiagram(content)).toBe(content)
  })

  test('ignores empty and whitespace-only lines when measuring the margin', () => {
    const content = ['    Model', '', '  ', '    update'].join('\n')

    expect(dedentDiagram(content)).toBe(['Model', '', '', 'update'].join('\n'))
  })

  test('returns content with no drawn lines unchanged', () => {
    expect(dedentDiagram('   \n  ')).toBe('   \n  ')
  })
})
