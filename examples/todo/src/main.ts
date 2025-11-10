import { KeyValueStore } from '@effect/platform'
import { BrowserKeyValueStore } from '@effect/platform-browser'
import { Array, Clock, Effect, Match as M, Option, Random, Schema as S, String } from 'effect'
import { Runtime } from 'foldkit'
import { Html, html } from 'foldkit/html'
import { ts } from 'foldkit/schema'
import { evo } from 'foldkit/struct'

// CONSTANT

const TODOS_STORAGE_KEY = 'todos'

// MODEL

const Todo = S.Struct({
  id: S.String,
  text: S.String,
  completed: S.Boolean,
  createdAt: S.Number,
})
type Todo = typeof Todo.Type

const Todos = S.Array(Todo)
type Todos = typeof Todos.Type

const Filter = S.Literal('All', 'Active', 'Completed')
type Filter = typeof Filter.Type

const NotEditing = ts('NotEditing')
type NotEditing = typeof NotEditing.Type

const Editing = ts('Editing', {
  id: S.String,
  text: S.String,
})
type Editing = typeof Editing.Type

const EditingState = S.Union(NotEditing, Editing)
type EditingState = typeof EditingState.Type

const Model = S.Struct({
  todos: Todos,
  newTodoText: S.String,
  filter: Filter,
  editing: EditingState,
})
type Model = typeof Model.Type

// MESSAGE

const NoOp = ts('NoOp')
const UpdateNewTodo = ts('UpdateNewTodo', { text: S.String })
const UpdateEditingTodo = ts('UpdateEditingTodo', { text: S.String })
const AddTodo = ts('AddTodo')
const GotNewTodoData = ts('GotNewTodoData', { id: S.String, timestamp: S.Number, text: S.String })
const DeleteTodo = ts('DeleteTodo', { id: S.String })
const ToggleTodo = ts('ToggleTodo', { id: S.String })
const StartEditing = ts('StartEditing', { id: S.String })
const SaveEdit = ts('SaveEdit')
const CancelEdit = ts('CancelEdit')
const ToggleAll = ts('ToggleAll')
const ClearCompleted = ts('ClearCompleted')
const SetFilter = ts('SetFilter', { filter: Filter })
const TodosSaved = ts('TodosSaved', { todos: Todos })

export const Message = S.Union(
  NoOp,
  UpdateNewTodo,
  UpdateEditingTodo,
  AddTodo,
  GotNewTodoData,
  DeleteTodo,
  ToggleTodo,
  StartEditing,
  SaveEdit,
  CancelEdit,
  ToggleAll,
  ClearCompleted,
  SetFilter,
  TodosSaved,
)

type NoOp = typeof NoOp.Type
type UpdateNewTodo = typeof UpdateNewTodo.Type
type UpdateEditingTodo = typeof UpdateEditingTodo.Type
type AddTodo = typeof AddTodo.Type
type GotNewTodoData = typeof GotNewTodoData.Type
type DeleteTodo = typeof DeleteTodo.Type
type ToggleTodo = typeof ToggleTodo.Type
type StartEditing = typeof StartEditing.Type
type SaveEdit = typeof SaveEdit.Type
type CancelEdit = typeof CancelEdit.Type
type ToggleAll = typeof ToggleAll.Type
type ClearCompleted = typeof ClearCompleted.Type
type SetFilter = typeof SetFilter.Type
type TodosSaved = typeof TodosSaved.Type

export type Message = typeof Message.Type

// FLAGS

const Flags = S.Struct({
  todos: S.Option(Todos),
})
type Flags = typeof Flags.Type

// INIT

const init: Runtime.ElementInit<Model, Message, Flags> = (flags) => [
  {
    todos: Option.getOrElse(flags.todos, () => []),
    newTodoText: '',
    filter: 'All',
    editing: NotEditing.make(),
  },
  [],
]

// UPDATE

const update = (model: Model, message: Message): [Model, ReadonlyArray<Runtime.Command<Message>>] =>
  M.value(message).pipe(
    M.withReturnType<[Model, ReadonlyArray<Runtime.Command<Message>>]>(),
    M.tagsExhaustive({
      NoOp: () => [model, []],

      UpdateNewTodo: ({ text }) => [
        evo(model, {
          newTodoText: () => text,
        }),
        [],
      ],

      UpdateEditingTodo: ({ text }) => [
        evo(model, {
          editing: () =>
            M.value(model.editing).pipe(
              M.tagsExhaustive({
                NotEditing: () => model.editing,
                Editing: ({ id }) => Editing.make({ id, text }),
              }),
            ),
        }),
        [],
      ],

      AddTodo: () => {
        if (String.isEmpty(String.trim(model.newTodoText))) {
          return [model, []]
        }

        return [model, [generateTodoData(String.trim(model.newTodoText))]]
      },

      GotNewTodoData: ({ id, timestamp, text }) => {
        const newTodo: Todo = {
          id,
          text,
          completed: false,
          createdAt: timestamp,
        }

        const updatedTodos = [...model.todos, newTodo]

        return [
          evo(model, {
            todos: () => updatedTodos,
            newTodoText: () => '',
          }),
          [saveTodos(updatedTodos)],
        ]
      },

      DeleteTodo: ({ id }) => {
        const updatedTodos = Array.filter(model.todos, (todo) => todo.id !== id)

        return [
          evo(model, {
            todos: () => updatedTodos,
          }),
          [saveTodos(updatedTodos)],
        ]
      },

      ToggleTodo: ({ id }) => {
        const updatedTodos = Array.map(model.todos, (todo) =>
          todo.id === id ? evo(todo, { completed: (completed) => !completed }) : todo,
        )

        return [
          evo(model, {
            todos: () => updatedTodos,
          }),
          [saveTodos(updatedTodos)],
        ]
      },

      StartEditing: ({ id }) => {
        const todo = Array.findFirst(model.todos, (t) => t.id === id)
        return [
          evo(model, {
            editing: () =>
              Editing.make({
                id,
                text: Option.match(todo, {
                  onNone: () => '',
                  onSome: (t) => t.text,
                }),
              }),
          }),
          [],
        ]
      },

      SaveEdit: () =>
        M.value(model.editing).pipe(
          M.withReturnType<[Model, Runtime.Command<TodosSaved>[]]>(),
          M.tagsExhaustive({
            NotEditing: () => [model, []],

            Editing: ({ id, text }) => {
              if (String.isEmpty(String.trim(text))) {
                return [
                  evo(model, {
                    editing: () => NotEditing.make(),
                  }),
                  [],
                ]
              }

              const updatedTodos = Array.map(model.todos, (todo) =>
                todo.id === id ? evo(todo, { text: () => String.trim(text) }) : todo,
              )

              return [
                evo(model, {
                  todos: () => updatedTodos,
                  editing: () => NotEditing.make(),
                }),
                [saveTodos(updatedTodos)],
              ]
            },
          }),
        ),

      CancelEdit: () => [
        evo(model, {
          editing: () => NotEditing.make(),
        }),
        [],
      ],

      ToggleAll: () => {
        const allCompleted = Array.every(model.todos, (todo) => todo.completed)
        const updatedTodos = Array.map(model.todos, (todo) =>
          evo(todo, {
            completed: () => !allCompleted,
          }),
        )

        return [
          evo(model, {
            todos: () => updatedTodos,
          }),
          [saveTodos(updatedTodos)],
        ]
      },

      ClearCompleted: () => {
        const updatedTodos = Array.filter(model.todos, (todo) => !todo.completed)

        return [
          evo(model, {
            todos: () => updatedTodos,
          }),
          [saveTodos(updatedTodos)],
        ]
      },

      SetFilter: ({ filter }) => [
        evo(model, {
          filter: () => filter,
        }),
        [],
      ],

      TodosSaved: ({ todos }) => [
        evo(model, {
          todos: () => todos,
        }),
        [],
      ],
    }),
  )

// COMMAND

const randomId = Effect.gen(function* () {
  const randomValue = yield* Random.next
  return randomValue.toString(36).substring(2, 15)
})

const generateTodoData = (text: string): Runtime.Command<GotNewTodoData> =>
  Effect.gen(function* () {
    const id = yield* randomId
    const timestamp = yield* Clock.currentTimeMillis
    return GotNewTodoData.make({ id, timestamp, text })
  })

// COMMAND

const saveTodos = (todos: Todos): Runtime.Command<TodosSaved> =>
  Effect.gen(function* () {
    const store = yield* KeyValueStore.KeyValueStore
    yield* store.set(TODOS_STORAGE_KEY, S.encodeSync(S.parseJson(Todos))(todos))
    return TodosSaved.make({ todos })
  }).pipe(
    Effect.catchAll(() => Effect.succeed(TodosSaved.make({ todos }))),
    Effect.provide(BrowserKeyValueStore.layerLocalStorage),
  )

// VIEW

const h = html<Message>()

const todoItemView =
  (model: Model) =>
  (todo: Todo): Html =>
    M.value(model.editing).pipe(
      M.tagsExhaustive({
        NotEditing: () => nonEditingTodoView(todo),
        Editing: ({ id, text }) =>
          id === todo.id ? editingTodoView(todo, text) : nonEditingTodoView(todo),
      }),
    )

const editingTodoView = (todo: Todo, text: string): Html =>
  h.li(
    [h.Class('flex items-center gap-3 p-3 bg-gray-50 rounded-lg')],
    [
      h.input([
        h.Type('text'),
        h.Id(`edit-${todo.id}`),
        h.Value(text),
        h.Class(
          'flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500',
        ),
        h.OnInput((text) => UpdateEditingTodo.make({ text })),
      ]),
      h.button(
        [
          h.OnClick(SaveEdit.make()),
          h.Class('px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600'),
        ],
        ['Save'],
      ),
      h.button(
        [
          h.OnClick(CancelEdit.make()),
          h.Class('px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600'),
        ],
        ['Cancel'],
      ),
    ],
  )

const nonEditingTodoView = (todo: Todo): Html =>
  h.li(
    [h.Class('flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg group')],
    [
      h.input([
        h.Type('checkbox'),
        h.Id(`todo-${todo.id}`),
        h.Value(todo.completed ? 'on' : ''),
        h.Class('w-4 h-4 text-blue-600 rounded focus:ring-blue-500'),
        h.OnClick(ToggleTodo.make({ id: todo.id })),
      ]),
      h.span(
        [
          h.Class(`flex-1 ${todo.completed ? 'line-through text-gray-500' : 'text-gray-900'}`),
          h.OnClick(StartEditing.make({ id: todo.id })),
        ],
        [todo.text],
      ),
      h.button(
        [
          h.OnClick(DeleteTodo.make({ id: todo.id })),
          h.Class(
            'px-2 py-1 text-red-600 opacity-0 group-hover:opacity-100 hover:bg-red-100 rounded transition-opacity',
          ),
        ],
        ['×'],
      ),
    ],
  )

const filterButtonView =
  (model: Model) =>
  (filter: Filter, label: string): Html =>
    h.button(
      [
        h.OnClick(SetFilter.make({ filter })),
        h.Class(
          `px-3 py-1 rounded ${
            model.filter === filter
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`,
        ),
      ],
      [label],
    )

const footerView = (model: Model, activeCount: number, completedCount: number): Html =>
  Array.match(model.todos, {
    onEmpty: () => h.empty,
    onNonEmpty: () =>
      h.div(
        [h.Class('flex flex-col gap-4')],
        [
          h.div(
            [h.Class('text-sm text-gray-600 text-center')],
            [`${activeCount} active, ${completedCount} completed`],
          ),

          h.div(
            [h.Class('flex justify-center gap-2')],
            [
              filterButtonView(model)('All', 'All'),
              filterButtonView(model)('Active', 'Active'),
              filterButtonView(model)('Completed', 'Completed'),
            ],
          ),

          h.div(
            [h.Class('flex justify-center gap-2')],
            [
              Array.match(model.todos, {
                onEmpty: () => h.empty,
                onNonEmpty: (todos) =>
                  h.button(
                    [
                      h.OnClick(ToggleAll.make()),
                      h.Class(
                        'px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300',
                      ),
                    ],
                    [
                      Array.every(todos, (t) => t.completed)
                        ? 'Mark all active'
                        : 'Mark all complete',
                    ],
                  ),
              }),

              completedCount > 0
                ? h.button(
                    [
                      h.OnClick(ClearCompleted.make()),
                      h.Class('px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200'),
                    ],
                    [`Clear ${completedCount} completed`],
                  )
                : h.empty,
            ],
          ),
        ],
      ),
  })

const filterTodos = (todos: Todos, filter: Filter): Todos =>
  M.value(filter).pipe(
    M.when('All', () => todos),
    M.when('Active', () => Array.filter(todos, (todo) => !todo.completed)),
    M.when('Completed', () => Array.filter(todos, (todo) => todo.completed)),
    M.exhaustive,
  )

const view = (model: Model): Html => {
  const filteredTodos = filterTodos(model.todos, model.filter)
  const activeCount = Array.length(Array.filter(model.todos, (todo) => !todo.completed))
  const completedCount = Array.length(model.todos) - activeCount

  return h.div(
    [h.Class('min-h-screen bg-gray-100 py-8')],
    [
      h.div(
        [h.Class('max-w-md mx-auto bg-white rounded-xl shadow-lg p-6')],
        [
          h.h1([h.Class('text-3xl font-bold text-gray-800 text-center mb-8')], ['Todo App']),

          h.form(
            [h.Class('mb-6'), h.OnSubmit(AddTodo.make())],
            [
              h.label([h.For('new-todo'), h.Class('sr-only')], ['New todo']),
              h.div(
                [h.Class('flex gap-3')],
                [
                  h.input([
                    h.Id('new-todo'),
                    h.Value(model.newTodoText),
                    h.Placeholder('What needs to be done?'),
                    h.Class(
                      'flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500',
                    ),
                    h.OnInput((text) => UpdateNewTodo.make({ text })),
                  ]),
                  h.button(
                    [
                      h.Type('submit'),
                      h.Class(
                        'px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500',
                      ),
                    ],
                    ['Add'],
                  ),
                ],
              ),
            ],
          ),

          Array.match(filteredTodos, {
            onEmpty: () =>
              h.div(
                [h.Class('text-center text-gray-500 py-8')],
                [
                  M.value(model.filter).pipe(
                    M.when('All', () => 'No todos yet. Add one above!'),
                    M.when('Active', () => 'No active todos'),
                    M.when('Completed', () => 'No completed todos'),
                    M.exhaustive,
                  ),
                ],
              ),
            onNonEmpty: (todos) =>
              h.ul([h.Class('space-y-2 mb-6')], Array.map(todos, todoItemView(model))),
          }),

          footerView(model, activeCount, completedCount),
        ],
      ),
    ],
  )
}

// FLAG

const flags: Effect.Effect<Flags> = Effect.gen(function* () {
  const store = yield* KeyValueStore.KeyValueStore
  const maybeTodosJson = yield* store.get(TODOS_STORAGE_KEY)
  const todosJson = yield* maybeTodosJson

  const decodeTodos = S.decode(S.parseJson(Todos))
  const todos = yield* decodeTodos(todosJson)

  return { todos: Option.some(todos) }
}).pipe(
  Effect.catchAll(() => Effect.succeed({ todos: Option.none() })),
  Effect.provide(BrowserKeyValueStore.layerLocalStorage),
)

// RUN

const element = Runtime.makeElement({
  Model,
  Flags,
  flags,
  init,
  update,
  view,
  container: document.getElementById('root')!,
})

Runtime.run(element)
