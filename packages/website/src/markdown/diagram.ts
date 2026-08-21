import { Array, Order, String, pipe } from 'effect'

const indentWidth = (line: string): number =>
  line.length - String.trimStart(line).length

/**
 * Strips the left margin every line of a diagram shares. A `pre` sizes itself
 * to its widest line, so indentation the author used to lay the drawing out
 * becomes part of the figure's width, and centering that figure leaves the
 * drawing sitting right of center with empty space beside it.
 */
export const dedentDiagram = (content: string): string => {
  const lines = String.split(content, '\n')

  const drawnLines = Array.filter(lines, line =>
    String.isNonEmpty(String.trim(line)),
  )

  return Array.match(drawnLines, {
    onEmpty: () => content,
    onNonEmpty: drawn => {
      const margin = Array.min(Array.map(drawn, indentWidth), Order.Number)

      return pipe(lines, Array.map(String.slice(margin)), Array.join('\n'))
    },
  })
}
