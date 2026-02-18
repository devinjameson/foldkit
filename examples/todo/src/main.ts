import { KeyValueStore } from '@effect/platform'
import { BrowserKeyValueStore } from '@effect/platform-browser'
import {
  Array,
  Clock,
  Effect,
  Match as M,
  Option,
  Random,
  Schema as S,
  String,
} from 'effect'
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
const GotNewTodoData = ts('GotNewTodoData', {
  id: S.String,
  timestamp: S.Number,
  text: S.String,
})
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
    editing: NotEditing(),
  },
  [],
]

// UPDATE

const update = (
  model: Model,
  message: Message,
): [Model, ReadonlyArray<Runtime.Command<Message>>] =>
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
                Editing: ({ id }) => Editing({ id, text }),
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
          todo.id === id
            ? evo(todo, { completed: (completed) => !completed })
            : todo,
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
              Editing({
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
          M.withReturnType<[Model, Runtime.Command<typeof TodosSaved>[]]>(),
          M.tagsExhaustive({
            NotEditing: () => [model, []],

            Editing: ({ id, text }) => {
              if (String.isEmpty(String.trim(text))) {
                return [
                  evo(model, {
                    editing: () => NotEditing(),
                  }),
                  [],
                ]
              }

              const updatedTodos = Array.map(model.todos, (todo) =>
                todo.id === id
                  ? evo(todo, { text: () => String.trim(text) })
                  : todo,
              )

              return [
                evo(model, {
                  todos: () => updatedTodos,
                  editing: () => NotEditing(),
                }),
                [saveTodos(updatedTodos)],
              ]
            },
          }),
        ),

      CancelEdit: () => [
        evo(model, {
          editing: () => NotEditing(),
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
        const updatedTodos = Array.filter(
          model.todos,
          (todo) => !todo.completed,
        )

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

const generateTodoData = (
  text: string,
): Runtime.Command<typeof GotNewTodoData> =>
  Effect.gen(function* () {
    const id = yield* randomId
    const timestamp = yield* Clock.currentTimeMillis
    return GotNewTodoData({ id, timestamp, text })
  })

// COMMAND

const saveTodos = (todos: Todos): Runtime.Command<typeof TodosSaved> =>
  Effect.gen(function* () {
    const store = yield* KeyValueStore.KeyValueStore
    yield* store.set(TODOS_STORAGE_KEY, S.encodeSync(S.parseJson(Todos))(todos))
    return TodosSaved({ todos })
  }).pipe(
    Effect.catchAll(() => Effect.succeed(TodosSaved({ todos }))),
    Effect.provide(BrowserKeyValueStore.layerLocalStorage),
  )

// VIEW

const {
  button,
  div,
  empty,
  form,
  h1,
  input,
  label,
  li,
  span,
  ul,
  Class,
  For,
  Id,
  OnClick,
  OnInput,
  OnSubmit,
  Placeholder,
  Type,
  Value,
} = html<Message>()

const todoItemView =
  (model: Model) =>
  (todo: Todo): Html =>
    M.value(model.editing).pipe(
      M.tagsExhaustive({
        NotEditing: () => nonEditingTodoView(todo),
        Editing: ({ id, text }) =>
          id === todo.id
            ? editingTodoView(todo, text)
            : nonEditingTodoView(todo),
      }),
    )

const editingTodoView = (todo: Todo, text: string): Html =>
  li(
    [Class('flex items-center gap-3 p-3 bg-gray-50 rounded-lg')],
    [
      input([
        Type('text'),
        Id(`edit-${todo.id}`),
        Value(text),
        Class(
          'flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500',
        ),
        OnInput((text) => UpdateEditingTodo({ text })),
      ]),
      button(
        [
          OnClick(SaveEdit()),
          Class('px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600'),
        ],
        ['Save'],
      ),
      button(
        [
          OnClick(CancelEdit()),
          Class('px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600'),
        ],
        ['Cancel'],
      ),
    ],
  )

const nonEditingTodoView = (todo: Todo): Html =>
  li(
    [Class('flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg group')],
    [
      input([
        Type('checkbox'),
        Id(`todo-${todo.id}`),
        Value(todo.completed ? 'on' : ''),
        Class('w-4 h-4 text-blue-600 rounded focus:ring-blue-500'),
        OnClick(ToggleTodo({ id: todo.id })),
      ]),
      span(
        [
          Class(
            `flex-1 ${todo.completed ? 'line-through text-gray-500' : 'text-gray-900'}`,
          ),
          OnClick(StartEditing({ id: todo.id })),
        ],
        [todo.text],
      ),
      button(
        [
          OnClick(DeleteTodo({ id: todo.id })),
          Class(
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
    button(
      [
        OnClick(SetFilter({ filter })),
        Class(
          `px-3 py-1 rounded ${
            model.filter === filter
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`,
        ),
      ],
      [label],
    )

const footerView = (
  model: Model,
  activeCount: number,
  completedCount: number,
): Html =>
  Array.match(model.todos, {
    onEmpty: () => empty,
    onNonEmpty: () =>
      div(
        [Class('flex flex-col gap-4')],
        [
          div(
            [Class('text-sm text-gray-600 text-center')],
            [`${activeCount} active, ${completedCount} completed`],
          ),

          div(
            [Class('flex justify-center gap-2')],
            [
              filterButtonView(model)('All', 'All'),
              filterButtonView(model)('Active', 'Active'),
              filterButtonView(model)('Completed', 'Completed'),
            ],
          ),

          div(
            [Class('flex justify-center gap-2')],
            [
              Array.match(model.todos, {
                onEmpty: () => empty,
                onNonEmpty: (todos) =>
                  button(
                    [
                      OnClick(ToggleAll()),
                      Class(
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
                ? button(
                    [
                      OnClick(ClearCompleted()),
                      Class(
                        'px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200',
                      ),
                    ],
                    [`Clear ${completedCount} completed`],
                  )
                : empty,
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
  const activeCount = Array.length(
    Array.filter(model.todos, (todo) => !todo.completed),
  )
  const completedCount = Array.length(model.todos) - activeCount

  return div(
    [Class('min-h-screen bg-gray-100 py-8')],
    [
      div(
        [Class('max-w-md mx-auto bg-white rounded-xl shadow-lg p-6')],
        [
          h1(
            [Class('text-3xl font-bold text-gray-800 text-center mb-8')],
            ['Todo App'],
          ),

          form(
            [Class('mb-6'), OnSubmit(AddTodo())],
            [
              label([For('new-todo'), Class('sr-only')], ['New todo']),
              div(
                [Class('flex gap-3')],
                [
                  input([
                    Id('new-todo'),
                    Value(model.newTodoText),
                    Placeholder('What needs to be done?'),
                    Class(
                      'flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500',
                    ),
                    OnInput((text) => UpdateNewTodo({ text })),
                  ]),
                  button(
                    [
                      Type('submit'),
                      Class(
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
              div(
                [Class('text-center text-gray-500 py-8')],
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
              ul(
                [Class('space-y-2 mb-6')],
                Array.map(todos, todoItemView(model)),
              ),
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
