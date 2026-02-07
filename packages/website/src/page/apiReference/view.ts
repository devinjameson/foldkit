import { Array, Option, Order, pipe } from 'effect'
import { Html } from 'foldkit/html'

import {
  Class,
  Href,
  Id,
  a,
  code,
  div,
  h3,
  p,
  span,
} from '../../html'
import { heading, para } from '../../prose'
import type {
  ApiFunction,
  ApiModule,
  ApiParameter,
  ApiType,
  ApiVariable,
} from './model'

const byName = <
  T extends { readonly name: string },
>(): Order.Order<T> =>
  Order.mapInput(Order.string, (item: T) => item.name)

// Function view

const functionView = (fn: ApiFunction): Html =>
  div(
    [
      Class(
        'mb-8 pb-8 border-b border-zinc-200 dark:border-zinc-700',
      ),
    ],
    [
      div(
        [Class('flex items-center gap-2 mb-2')],
        [
          h3(
            [
              Class('text-lg font-mono font-medium scroll-mt-6'),
              Id(`fn-${fn.name}`),
            ],
            [fn.name],
          ),
          span(
            [
              Class(
                'text-xs px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300',
              ),
            ],
            ['function'],
          ),
          ...pipe(
            fn.sourceUrl,
            Option.match({
              onNone: () => [],
              onSome: (url) => [
                a(
                  [
                    Class(
                      'text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300',
                    ),
                    Href(url),
                  ],
                  ['source'],
                ),
              ],
            }),
          ),
        ],
      ),
      ...pipe(
        fn.description,
        Option.match({
          onNone: () => [],
          onSome: (desc) => [
            p(
              [Class('text-zinc-600 dark:text-zinc-400 mb-4')],
              [desc],
            ),
          ],
        }),
      ),
      ...Array.map(fn.signatures, signatureView),
    ],
  )

const signatureView = (sig: {
  readonly parameters: ReadonlyArray<ApiParameter>
  readonly returnType: string
  readonly typeParameters: ReadonlyArray<string>
}): Html =>
  div(
    [
      Class(
        'bg-zinc-50 dark:bg-zinc-800 rounded p-4 font-mono text-sm',
      ),
    ],
    [
      ...(Array.isNonEmptyReadonlyArray(sig.typeParameters)
        ? [
            div(
              [Class('text-zinc-500 mb-2')],
              [`<${Array.join(sig.typeParameters, ', ')}>`],
            ),
          ]
        : []),
      ...(Array.isNonEmptyReadonlyArray(sig.parameters)
        ? [
            div(
              [Class('mb-2')],
              [
                span([Class('text-zinc-500')], ['(']),
                ...Array.flatMap(sig.parameters, (param, i) => [
                  ...(i > 0
                    ? [span([Class('text-zinc-500')], [', '])]
                    : []),
                  span(
                    [Class('text-blue-600 dark:text-blue-400')],
                    [param.name],
                  ),
                  ...(param.isOptional
                    ? [span([Class('text-zinc-500')], ['?'])]
                    : []),
                  span([Class('text-zinc-500')], [': ']),
                  span([], [param.type]),
                ]),
                span([Class('text-zinc-500')], [')']),
              ],
            ),
            ...pipe(
              sig.parameters,
              Array.filter((param) =>
                Option.isSome(param.description),
              ),
              Array.match({
                onEmpty: () => [],
                onNonEmpty: (params) => [
                  div(
                    [
                      Class(
                        'mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-700 text-sm',
                      ),
                    ],
                    Array.map(params, (param) =>
                      div(
                        [Class('mb-1')],
                        [
                          span(
                            [
                              Class(
                                'text-blue-600 dark:text-blue-400',
                              ),
                            ],
                            [param.name],
                          ),
                          span(
                            [
                              Class(
                                'text-zinc-500 dark:text-zinc-400',
                              ),
                            ],
                            [
                              ` — ${Option.getOrElse(param.description, () => '')}`,
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              }),
            ),
          ]
        : [
            div(
              [Class('mb-2')],
              [span([Class('text-zinc-500')], ['()'])],
            ),
          ]),
      div(
        [],
        [
          span([Class('text-zinc-500')], ['→ ']),
          span(
            [Class('text-green-600 dark:text-green-400')],
            [sig.returnType],
          ),
        ],
      ),
    ],
  )

// Type view

const typeView = (type: ApiType): Html =>
  div(
    [
      Class(
        'mb-6 pb-6 border-b border-zinc-200 dark:border-zinc-700',
      ),
    ],
    [
      div(
        [Class('flex items-center gap-2 mb-2')],
        [
          h3(
            [
              Class('text-lg font-mono font-medium scroll-mt-6'),
              Id(`type-${type.name}`),
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
          ...pipe(
            type.sourceUrl,
            Option.match({
              onNone: () => [],
              onSome: (url) => [
                a(
                  [
                    Class(
                      'text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300',
                    ),
                    Href(url),
                  ],
                  ['source'],
                ),
              ],
            }),
          ),
        ],
      ),
      ...pipe(
        type.description,
        Option.match({
          onNone: () => [],
          onSome: (desc) => [
            p(
              [Class('text-zinc-600 dark:text-zinc-400 mb-2')],
              [desc],
            ),
          ],
        }),
      ),
      code(
        [
          Class(
            'block bg-zinc-50 dark:bg-zinc-800 rounded p-4 font-mono text-sm',
          ),
        ],
        [type.typeDefinition],
      ),
    ],
  )

// Variable view

const variableView = (variable: ApiVariable): Html =>
  div(
    [
      Class(
        'mb-6 pb-6 border-b border-zinc-200 dark:border-zinc-700',
      ),
    ],
    [
      div(
        [Class('flex items-center gap-2 mb-2')],
        [
          h3(
            [
              Class('text-lg font-mono font-medium scroll-mt-6'),
              Id(`const-${variable.name}`),
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
          ...pipe(
            variable.sourceUrl,
            Option.match({
              onNone: () => [],
              onSome: (url) => [
                a(
                  [
                    Class(
                      'text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300',
                    ),
                    Href(url),
                  ],
                  ['source'],
                ),
              ],
            }),
          ),
        ],
      ),
      ...pipe(
        variable.description,
        Option.match({
          onNone: () => [],
          onSome: (desc) => [
            p(
              [Class('text-zinc-600 dark:text-zinc-400 mb-2')],
              [desc],
            ),
          ],
        }),
      ),
      code(
        [
          Class(
            'block bg-zinc-50 dark:bg-zinc-800 rounded p-4 font-mono text-sm',
          ),
        ],
        [variable.type],
      ),
    ],
  )

// Full API reference view (all modules on one page)

export const fullView = (modules: ReadonlyArray<ApiModule>): Html =>
  div(
    [],
    [
      heading('h1', 'api-reference', 'API Reference'),
      ...Array.flatMap(modules, (module) => [
        heading('h2', module.name, module.name),
        // CLAUDE: We can use Array.match for these and also I think these are
        // repeating the same h3 + list, so that probably wants to be an
        // extracted view fn
        ...(Array.isNonEmptyReadonlyArray(module.functions)
          ? [
              h3(
                [
                  Class(
                    'text-lg font-semibold mt-6 mb-4 text-zinc-700 dark:text-zinc-300',
                  ),
                ],
                ['Functions'],
              ),
              ...pipe(
                module.functions,
                Array.sort(byName()),
                Array.map(functionView),
              ),
            ]
          : []),
        ...(Array.isNonEmptyReadonlyArray(module.types)
          ? [
              h3(
                [
                  Class(
                    'text-lg font-semibold mt-6 mb-4 text-zinc-700 dark:text-zinc-300',
                  ),
                ],
                ['Types'],
              ),
              ...pipe(
                module.types,
                Array.sort(byName()),
                Array.map(typeView),
              ),
            ]
          : []),
        ...(Array.isNonEmptyReadonlyArray(module.variables)
          ? [
              h3(
                [
                  Class(
                    'text-lg font-semibold mt-6 mb-4 text-zinc-700 dark:text-zinc-300',
                  ),
                ],
                ['Constants'],
              ),
              ...pipe(
                module.variables,
                Array.sort(byName()),
                Array.map(variableView),
              ),
            ]
          : []),
      ]),
    ],
  )
