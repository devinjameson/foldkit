import { Array } from 'effect'
import { Html, inertHtml as ih } from 'foldkit/html'

// SHARED STYLES

const headerCellClassName =
  'py-2 pr-4 text-left font-medium text-gray-900 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700/50'

const rowClassName = 'border-b border-gray-200 dark:border-gray-700/50'

const cellClassName = 'py-2.5 pr-4 align-top'

const typeCellClassName = 'py-2.5 pr-4 align-top min-w-[20rem] max-w-md'

const descriptionCellClassName = 'py-2.5 align-top min-w-[18rem]'

const codeClassName =
  'bg-gray-200/70 dark:bg-gray-800 px-1 py-px rounded text-sm border border-gray-300/50 dark:border-gray-700/50 whitespace-nowrap'

const wrappingCodeClassName =
  'bg-gray-200/70 dark:bg-gray-800 px-1 py-px rounded text-sm border border-gray-300/50 dark:border-gray-700/50 whitespace-pre-wrap break-normal'

const inlineCode = (text: string): Html =>
  ih.code([ih.Class(codeClassName)], [text])

const wrappingInlineCode = (text: string): Html =>
  ih.code([ih.Class(wrappingCodeClassName)], [text])

// PROP TABLE

export type PropEntry = Readonly<{
  name: string
  type: string
  default?: string
  description: string | Html
}>

const propRow = (entry: PropEntry): Html =>
  ih.tr(
    [ih.Class(rowClassName)],
    [
      ih.td([ih.Class(cellClassName)], [inlineCode(entry.name)]),
      ih.td([ih.Class(typeCellClassName)], [wrappingInlineCode(entry.type)]),
      ih.td(
        [ih.Class(cellClassName)],
        [
          entry.default !== undefined
            ? inlineCode(entry.default)
            : ih.span(
                [ih.Class('text-gray-400 dark:text-gray-500 text-sm')],
                ['-'],
              ),
        ],
      ),
      ih.td([ih.Class(descriptionCellClassName)], [entry.description]),
    ],
  )

export const propTable = (entries: ReadonlyArray<PropEntry>): Html =>
  ih.div(
    [ih.Class('mb-8 overflow-x-auto')],
    [
      ih.table(
        [ih.Class('w-full text-sm')],
        [
          ih.thead(
            [],
            [
              ih.tr(
                [],
                [
                  ih.th([ih.Class(headerCellClassName)], ['Name']),
                  ih.th([ih.Class(headerCellClassName)], ['Type']),
                  ih.th([ih.Class(headerCellClassName)], ['Default']),
                  ih.th([ih.Class(headerCellClassName)], ['Description']),
                ],
              ),
            ],
          ),
          ih.tbody([], Array.map(entries, propRow)),
        ],
      ),
    ],
  )

// KEYBOARD TABLE

export type KeyboardEntry = Readonly<{
  key: string
  description: string
}>

const keyboardKeyClassName =
  'inline-flex items-center justify-center min-w-[1.5rem] px-1.5 py-0.5 rounded border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 text-sm font-mono text-gray-700 dark:text-gray-300'

const keyboardRow = (entry: KeyboardEntry): Html =>
  ih.tr(
    [ih.Class(rowClassName)],
    [
      ih.td(
        [ih.Class(cellClassName)],
        [ih.span([ih.Class(keyboardKeyClassName)], [entry.key])],
      ),
      ih.td([ih.Class(descriptionCellClassName)], [entry.description]),
    ],
  )

export const keyboardTable = (entries: ReadonlyArray<KeyboardEntry>): Html =>
  ih.div(
    [ih.Class('mb-8 overflow-x-auto')],
    [
      ih.table(
        [ih.Class('w-full text-sm')],
        [
          ih.thead(
            [],
            [
              ih.tr(
                [],
                [
                  ih.th([ih.Class(headerCellClassName)], ['Key']),
                  ih.th([ih.Class(headerCellClassName)], ['Description']),
                ],
              ),
            ],
          ),
          ih.tbody([], Array.map(entries, keyboardRow)),
        ],
      ),
    ],
  )

// DATA ATTRIBUTE TABLE

export type DataAttributeEntry = Readonly<{
  attribute: string
  condition: string
}>

const dataAttributeRow = (entry: DataAttributeEntry): Html =>
  ih.tr(
    [ih.Class(rowClassName)],
    [
      ih.td([ih.Class(cellClassName)], [inlineCode(entry.attribute)]),
      ih.td([ih.Class(descriptionCellClassName)], [entry.condition]),
    ],
  )

export const dataAttributeTable = (
  entries: ReadonlyArray<DataAttributeEntry>,
): Html =>
  ih.div(
    [ih.Class('mb-8 overflow-x-auto')],
    [
      ih.table(
        [ih.Class('w-full text-sm')],
        [
          ih.thead(
            [],
            [
              ih.tr(
                [],
                [
                  ih.th([ih.Class(headerCellClassName)], ['Attribute']),
                  ih.th([ih.Class(headerCellClassName)], ['Condition']),
                ],
              ),
            ],
          ),
          ih.tbody([], Array.map(entries, dataAttributeRow)),
        ],
      ),
    ],
  )
