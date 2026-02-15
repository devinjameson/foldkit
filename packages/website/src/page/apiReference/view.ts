import { Array, Option, Order, Record, String, pipe } from 'effect'
import { Html } from 'foldkit/html'
import highlights from 'virtual:api-highlights'

import {
  Class,
  Href,
  Id,
  InnerHTML,
  a,
  details,
  div,
  h4,
  p,
  span,
  summary,
} from '../../html'
import {
  heading,
  headingLinkButton,
  inlineCode,
  pageTitle,
} from '../../prose'
import type {
  ApiFunction,
  ApiInterface,
  ApiModule,
  ApiParameter,
  ApiType,
  ApiVariable,
} from './domain'

const descriptionWithCode = (
  text: string,
): ReadonlyArray<Html | string> => {
  const parts = String.split(text, '`')
  return Array.map(parts, (part, index) =>
    index % 2 === 1 ? inlineCode(part) : part,
  )
}

const byName = <
  T extends { readonly name: string },
>(): Order.Order<T> =>
  Order.mapInput(Order.string, ({ name }: T) => name)

const scopedId = (
  kind: string,
  moduleName: string,
  name: string,
): string => `${kind}-${moduleName}/${name}`

const functionView = (
  moduleName: string,
  apiFunction: ApiFunction,
): Html => {
  const id = scopedId('function', moduleName, apiFunction.name)

  return div(
    [Class('mb-8')],
    [
      div(
        [
          Class(
            'group flex items-center gap-1 mb-2 md:flex-row-reverse md:justify-end md:-ml-8',
          ),
        ],
        [
          div(
            [Class('flex items-center gap-2')],
            [
              h4(
                [
                  Class(
                    'text-base font-mono font-medium text-gray-900 dark:text-white scroll-mt-6',
                  ),
                  Id(id),
                ],
                [apiFunction.name],
              ),
              span(
                [
                  Class(
                    'text-xs px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300',
                  ),
                ],
                ['function'],
              ),
              ...Option.match(apiFunction.sourceUrl, {
                onNone: () => [],
                onSome: (url) => [
                  a(
                    [
                      Class(
                        'text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300',
                      ),
                      Href(url),
                    ],
                    ['source'],
                  ),
                ],
              }),
            ],
          ),
          headingLinkButton(id, apiFunction.name),
        ],
      ),
      ...Option.match(apiFunction.description, {
        onNone: () => [],
        onSome: (description) => [
          p(
            [Class('text-gray-600 dark:text-gray-400 mb-4')],
            descriptionWithCode(description),
          ),
        ],
      }),
      signaturesView(id, apiFunction),
    ],
  )
}

const SIGNATURE_COLLAPSE_THRESHOLD = 500

const signaturesLength = (apiFunction: ApiFunction): number =>
  Array.reduce(
    apiFunction.signatures,
    0,
    (total, signature) =>
      total +
      pipe(
        signature.typeParameters,
        Array.join(', '),
        String.length,
      ) +
      Array.reduce(
        signature.parameters,
        0,
        (innerTotal, parameter) =>
          innerTotal +
          String.length(parameter.name) +
          String.length(parameter.type),
      ) +
      String.length(signature.returnType),
  )

const allParameterDescriptions = (
  apiFunction: ApiFunction,
): ReadonlyArray<Html> =>
  pipe(
    Array.flatMap(
      apiFunction.signatures,
      (signature) => signature.parameters,
    ),
    Array.dedupeWith((a, b) => a.name === b.name),
    Array.filterMap((parameter) =>
      Option.map(parameter.description, (description) =>
        div(
          [Class('mb-1')],
          [
            span(
              [Class('font-medium text-gray-900 dark:text-gray-200')],
              [parameter.name],
            ),
            span(
              [Class('text-gray-500 dark:text-gray-400')],
              [` — ${description}`],
            ),
          ],
        ),
      ),
    ),
    Array.match({
      onEmpty: () => [],
      onNonEmpty: (items) => [
        div(
          [
            Class(
              'mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 text-sm',
            ),
          ],
          items,
        ),
      ],
    }),
  )

const signaturesView = (
  key: string,
  apiFunction: ApiFunction,
): Html => {
  const maybeHighlighted = Record.get(highlights, key)

  const isLong =
    signaturesLength(apiFunction) > SIGNATURE_COLLAPSE_THRESHOLD

  return Option.match(maybeHighlighted, {
    onSome: (highlighted) => {
      const content: ReadonlyArray<Html> = [
        div([InnerHTML(highlighted)], []),
        ...allParameterDescriptions(apiFunction),
      ]
      const highlightedClass =
        'rounded text-sm [&_pre]:!rounded [&_pre]:!py-4 [&_pre]:!pl-4 [&_pre]:!pr-0 [&_code]:block [&_code]:w-fit [&_code]:min-w-full [&_code]:pr-4'

      return isLong
        ? details(
            [Class(highlightedClass)],
            [
              summary(
                [
                  Class(
                    'cursor-pointer text-gray-500 hover:text-gray-700 dark:hover:text-gray-300',
                  ),
                ],
                ['Show signature'],
              ),
              div([Class('mt-2')], content),
            ],
          )
        : div([Class(highlightedClass)], content)
    },
    onNone: () => {
      const fallbackClass =
        'bg-white dark:bg-gray-800 rounded p-4 font-mono text-sm'
      const content = Array.flatMap(
        apiFunction.signatures,
        (signature) => signatureChildrenFallback(signature),
      )

      return isLong
        ? details(
            [Class(fallbackClass)],
            [
              summary(
                [
                  Class(
                    'cursor-pointer list-none [&::-webkit-details-marker]:hidden text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 select-none',
                  ),
                ],
                ['Show signature'],
              ),
              div([Class('mt-3')], content),
            ],
          )
        : div([Class(fallbackClass)], content)
    },
  })
}

const parameterDescriptions = (
  parameters: ReadonlyArray<ApiParameter>,
): ReadonlyArray<Html> =>
  pipe(
    parameters,
    Array.filterMap((parameter) =>
      Option.map(parameter.description, (description) =>
        div(
          [Class('mb-1')],
          [
            span(
              [Class('font-medium text-gray-900 dark:text-gray-200')],
              [parameter.name],
            ),
            span(
              [Class('text-gray-500 dark:text-gray-400')],
              [` — ${description}`],
            ),
          ],
        ),
      ),
    ),
    Array.match({
      onEmpty: () => [],
      onNonEmpty: (items) => [
        div(
          [
            Class(
              'mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 text-sm',
            ),
          ],
          items,
        ),
      ],
    }),
  )

const punctuation = (text: string): Html =>
  span([Class('text-gray-500')], [text])

const parameterView = (
  parameter: ApiParameter,
): ReadonlyArray<Html> => [
  span(
    [Class('font-medium text-gray-900 dark:text-gray-200')],
    [parameter.name],
  ),
  ...(parameter.isOptional ? [punctuation('?')] : []),
  punctuation(': '),
  span([Class('whitespace-pre-wrap')], [parameter.type]),
]

const parameterListView = (
  parameters: ReadonlyArray<ApiParameter>,
): ReadonlyArray<Html> =>
  Array.match(parameters, {
    onEmpty: () => [div([Class('mb-2')], [punctuation('()')])],
    onNonEmpty: (nonEmpty) => [
      div(
        [Class('mb-2')],
        [
          punctuation('('),
          ...Array.flatMap(nonEmpty, (parameter, index) => [
            ...(index > 0 ? [punctuation(', ')] : []),
            ...parameterView(parameter),
          ]),
          punctuation(')'),
        ],
      ),
      ...parameterDescriptions(nonEmpty),
    ],
  })

const returnTypeView = (returnType: string): Html =>
  div(
    [Class('whitespace-pre-wrap')],
    [
      punctuation('→ '),
      span(
        [Class('text-green-600 dark:text-green-400')],
        [returnType],
      ),
    ],
  )

const signatureChildrenFallback = (signature: {
  readonly parameters: ReadonlyArray<ApiParameter>
  readonly returnType: string
  readonly typeParameters: ReadonlyArray<string>
}): ReadonlyArray<Html> => [
  ...Array.match(signature.typeParameters, {
    onEmpty: () => [],
    onNonEmpty: (typeParameters) => [
      div(
        [Class('text-gray-500 mb-2')],
        [`<${Array.join(typeParameters, ', ')}>`],
      ),
    ],
  }),
  ...parameterListView(signature.parameters),
  returnTypeView(signature.returnType),
]

const typeView = (moduleName: string, type: ApiType): Html => {
  const id = scopedId('type', moduleName, type.name)
  const maybeHighlighted = Record.get(highlights, id)

  return div(
    [Class('mb-6')],
    [
      div(
        [
          Class(
            'group flex items-center gap-1 mb-2 md:flex-row-reverse md:justify-end md:-ml-8',
          ),
        ],
        [
          div(
            [Class('flex items-center gap-2')],
            [
              h4(
                [
                  Class(
                    'text-base font-mono font-medium text-gray-900 dark:text-white scroll-mt-6',
                  ),
                  Id(id),
                ],
                [type.name],
              ),
              span(
                [
                  Class(
                    'text-xs px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300',
                  ),
                ],
                ['type'],
              ),
              ...Option.match(type.sourceUrl, {
                onNone: () => [],
                onSome: (url) => [
                  a(
                    [
                      Class(
                        'text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300',
                      ),
                      Href(url),
                    ],
                    ['source'],
                  ),
                ],
              }),
            ],
          ),
          headingLinkButton(id, type.name),
        ],
      ),
      ...Option.match(type.description, {
        onNone: () => [],
        onSome: (description) => [
          p(
            [Class('text-gray-600 dark:text-gray-400 mb-2')],
            descriptionWithCode(description),
          ),
        ],
      }),
      ...Option.match(maybeHighlighted, {
        onSome: (highlighted) => [
          div(
            [
              Class(
                'rounded text-sm [&_pre]:!rounded [&_pre]:!py-4 [&_pre]:!pl-4 [&_pre]:!pr-0 [&_code]:block [&_code]:w-fit [&_code]:min-w-full [&_code]:pr-4',
              ),
              InnerHTML(highlighted),
            ],
            [],
          ),
        ],
        onNone: () => [
          div(
            [
              Class(
                'block bg-gray-50 dark:bg-gray-800 rounded p-4 font-mono text-sm whitespace-pre-wrap',
              ),
            ],
            [type.typeDefinition],
          ),
        ],
      }),
    ],
  )
}

const interfaceView = (
  moduleName: string,
  apiInterface: ApiInterface,
): Html => {
  const id = scopedId('interface', moduleName, apiInterface.name)
  const maybeHighlighted = Record.get(highlights, id)

  return div(
    [Class('mb-6')],
    [
      div(
        [
          Class(
            'group flex items-center gap-1 mb-2 md:flex-row-reverse md:justify-end md:-ml-8',
          ),
        ],
        [
          div(
            [Class('flex items-center gap-2')],
            [
              h4(
                [
                  Class(
                    'text-base font-mono font-medium text-gray-900 dark:text-white scroll-mt-6',
                  ),
                  Id(id),
                ],
                [apiInterface.name],
              ),
              span(
                [
                  Class(
                    'text-xs px-2 py-0.5 rounded bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300',
                  ),
                ],
                ['interface'],
              ),
              ...Option.match(apiInterface.sourceUrl, {
                onNone: () => [],
                onSome: (url) => [
                  a(
                    [
                      Class(
                        'text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300',
                      ),
                      Href(url),
                    ],
                    ['source'],
                  ),
                ],
              }),
            ],
          ),
          headingLinkButton(id, apiInterface.name),
        ],
      ),
      ...Option.match(apiInterface.description, {
        onNone: () => [],
        onSome: (description) => [
          p(
            [Class('text-gray-600 dark:text-gray-400 mb-2')],
            descriptionWithCode(description),
          ),
        ],
      }),
      ...Option.match(maybeHighlighted, {
        onSome: (highlighted) => [
          div(
            [
              Class(
                'rounded text-sm [&_pre]:!rounded [&_pre]:!py-4 [&_pre]:!pl-4 [&_pre]:!pr-0 [&_code]:block [&_code]:w-fit [&_code]:min-w-full [&_code]:pr-4',
              ),
              InnerHTML(highlighted),
            ],
            [],
          ),
        ],
        onNone: () => [
          div(
            [
              Class(
                'block bg-gray-50 dark:bg-gray-800 rounded p-4 font-mono text-sm whitespace-pre-wrap',
              ),
            ],
            [apiInterface.typeDefinition],
          ),
        ],
      }),
    ],
  )
}

const variableView = (
  moduleName: string,
  variable: ApiVariable,
): Html => {
  const id = scopedId('const', moduleName, variable.name)
  const maybeHighlighted = Record.get(highlights, id)

  return div(
    [Class('mb-6')],
    [
      div(
        [
          Class(
            'group flex items-center gap-1 mb-2 md:flex-row-reverse md:justify-end md:-ml-8',
          ),
        ],
        [
          div(
            [Class('flex items-center gap-2')],
            [
              h4(
                [
                  Class(
                    'text-base font-mono font-medium text-gray-900 dark:text-white scroll-mt-6',
                  ),
                  Id(id),
                ],
                [variable.name],
              ),
              span(
                [
                  Class(
                    'text-xs px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300',
                  ),
                ],
                ['const'],
              ),
              ...Option.match(variable.sourceUrl, {
                onNone: () => [],
                onSome: (url) => [
                  a(
                    [
                      Class(
                        'text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300',
                      ),
                      Href(url),
                    ],
                    ['source'],
                  ),
                ],
              }),
            ],
          ),
          headingLinkButton(id, variable.name),
        ],
      ),
      ...Option.match(variable.description, {
        onNone: () => [],
        onSome: (description) => [
          p(
            [Class('text-gray-600 dark:text-gray-400 mb-2')],
            descriptionWithCode(description),
          ),
        ],
      }),
      ...Option.match(maybeHighlighted, {
        onSome: (highlighted) => [
          div(
            [
              Class(
                'rounded text-sm [&_pre]:!rounded [&_pre]:!py-4 [&_pre]:!pl-4 [&_pre]:!pr-0 [&_code]:block [&_code]:w-fit [&_code]:min-w-full [&_code]:pr-4',
              ),
              InnerHTML(highlighted),
            ],
            [],
          ),
        ],
        onNone: () => [
          div(
            [
              Class(
                'block bg-gray-50 dark:bg-gray-800 rounded p-4 font-mono text-sm whitespace-pre-wrap',
              ),
            ],
            [variable.type],
          ),
        ],
      }),
    ],
  )
}

const section = <T extends { readonly name: string }>(
  moduleName: string,
  label: string,
  items: ReadonlyArray<T>,
  itemView: (moduleName: string, item: T) => Html,
): ReadonlyArray<Html> =>
  Array.match(items, {
    onEmpty: () => [],
    onNonEmpty: (items) => [
      heading('h3', `${moduleName}-${label.toLowerCase()}`, label),
      ...pipe(
        items,
        Array.sort(byName()),
        Array.map((item) => itemView(moduleName, item)),
      ),
    ],
  })

export const view = (modules: ReadonlyArray<ApiModule>): Html =>
  div(
    [],
    [
      pageTitle('api-reference', 'API Reference'),
      ...Array.flatMap(modules, (module, index) => [
        div(
          [
            Class(
              index > 0
                ? 'border-t border-gray-300 dark:border-gray-600 mt-8'
                : '',
            ),
          ],
          [
            heading('h2', module.name, module.name),
            ...section(
              module.name,
              'Functions',
              module.functions,
              functionView,
            ),
            ...section(module.name, 'Types', module.types, typeView),
            ...section(
              module.name,
              'Interfaces',
              module.interfaces,
              interfaceView,
            ),
            ...section(
              module.name,
              'Constants',
              module.variables,
              variableView,
            ),
          ],
        ),
      ]),
    ],
  )
