import { Array, Option, pipe } from 'effect'
import { Html } from 'foldkit/html'

import {
  Class,
  Href,
  Id,
  a,
  code,
  div,
  h2,
  h3,
  li,
  p,
  span,
  ul,
} from '../../html'
import { heading, para } from '../../prose'
import type {
  ApiFunction,
  ApiModule,
  ApiParameter,
  ApiType,
  ApiVariable,
} from './model'

// Module list view (sidebar or index)

export const moduleList = (
  modules: ReadonlyArray<ApiModule>,
  currentModule: Option.Option<string>,
): Html =>
  ul(
    [Class('space-y-1')],
    Array.map(modules, (module) =>
      li(
        [],
        [
          a(
            [
              Class(
                pipe(
                  currentModule,
                  Option.match({
                    onNone: () =>
                      'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100',
                    onSome: (name) =>
                      name === module.name
                        ? 'text-blue-600 dark:text-blue-400 font-medium'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100',
                  }),
                ),
              ),
              Href(`/api/${module.name}`),
            ],
            [module.name],
          ),
        ],
      ),
    ),
  )

// Module detail view

export const moduleView = (module: ApiModule): Html =>
  div(
    [],
    [
      heading('h1', `api-${module.name}`, module.name),
      ...(Array.isNonEmptyReadonlyArray(module.types)
        ? [
            h2([Class('text-xl font-semibold mt-8 mb-4')], ['Types']),
            ...Array.map(module.types, typeView),
          ]
        : []),
      ...(Array.isNonEmptyReadonlyArray(module.functions)
        ? [
            h2(
              [Class('text-xl font-semibold mt-8 mb-4')],
              ['Functions'],
            ),
            ...Array.map(module.functions, functionView),
          ]
        : []),
      ...(Array.isNonEmptyReadonlyArray(module.variables)
        ? [
            h2(
              [Class('text-xl font-semibold mt-8 mb-4')],
              ['Variables'],
            ),
            ...Array.map(module.variables, variableView),
          ]
        : []),
    ],
  )

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
            [Class('text-lg font-mono font-medium'), Id(fn.name)],
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
            [Class('text-lg font-mono font-medium'), Id(type.name)],
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
              Class('text-lg font-mono font-medium'),
              Id(variable.name),
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

// API index view

export const indexView = (modules: ReadonlyArray<ApiModule>): Html =>
  div(
    [],
    [
      heading('h1', 'api-reference', 'API Reference'),
      para(
        'This is the API reference for Foldkit. Select a module from the sidebar to view its contents.',
      ),
      h2([Class('text-xl font-semibold mt-8 mb-4')], ['Modules']),
      ul(
        [Class('space-y-4')],
        Array.map(modules, (module) =>
          li(
            [
              Class(
                'border-b border-zinc-200 dark:border-zinc-700 pb-4',
              ),
            ],
            [
              a(
                [
                  Class(
                    'text-lg font-mono text-blue-600 dark:text-blue-400 hover:underline',
                  ),
                  Href(`/api/${module.name}`),
                ],
                [module.name],
              ),
              div(
                [
                  Class(
                    'text-sm text-zinc-600 dark:text-zinc-400 mt-1',
                  ),
                ],
                [
                  `${module.functions.length} functions, ${module.types.length} types, ${module.variables.length} variables`,
                ],
              ),
            ],
          ),
        ),
      ),
    ],
  )
