import { Array, Effect, Match, Option, Schema as S, String } from 'effect'

import { Fold, Runtime } from '@foldkit'
import {
  Class,
  For,
  Html,
  Id,
  OnChange,
  OnClick,
  OnSubmit,
  Placeholder,
  Type,
  Value,
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
} from '@foldkit/html'
import { ST, ts } from '@foldkit/schema'

// MODEL

const Todo = S.Struct({
  id: S.String,
  text: S.String,
  completed: S.Boolean,
  createdAt: S.Number,
})
type Todo = ST<typeof Todo>

const Todos = S.Array(Todo)
type Todos = ST<typeof Todos>

const Filter = S.Literal('All', 'Active', 'Completed')
type Filter = ST<typeof Filter>

const NotEditing = ts('NotEditing')
type NotEditing = ST<typeof NotEditing>

const Editing = ts('Editing', {
  id: S.String,
  text: S.String,
})
type Editing = ST<typeof Editing>

const EditingState = S.Union(NotEditing, Editing)
type EditingState = ST<typeof EditingState>

const Model = S.Struct({
  todos: Todos,
  newTodoText: S.String,
  filter: Filter,
  editing: EditingState,
})
type Model = ST<typeof Model>

// MESSAGE

const NoOp = ts('NoOp')
const UpdateNewTodo = ts('UpdateNewTodo', { text: S.String })
const UpdateEditingTodo = ts('UpdateEditingTodo', { text: S.String })
const AddTodo = ts('AddTodo')
const DeleteTodo = ts('DeleteTodo', { id: S.String })
const ToggleTodo = ts('ToggleTodo', { id: S.String })
const StartEditing = ts('StartEditing', { id: S.String })
const SaveEdit = ts('SaveEdit')
const CancelEdit = ts('CancelEdit')
const ToggleAll = ts('ToggleAll')
const ClearCompleted = ts('ClearCompleted')
const SetFilter = ts('SetFilter', { filter: Filter })
const TodosLoaded = ts('TodosLoaded', { todos: Todos })
const TodosSaved = ts('TodosSaved', { todos: Todos })

export const Message = S.Union(
  NoOp,
  UpdateNewTodo,
  UpdateEditingTodo,
  AddTodo,
  DeleteTodo,
  ToggleTodo,
  StartEditing,
  SaveEdit,
  CancelEdit,
  ToggleAll,
  ClearCompleted,
  SetFilter,
  TodosLoaded,
  TodosSaved,
)

type NoOp = ST<typeof NoOp>
type UpdateNewTodo = ST<typeof UpdateNewTodo>
type UpdateEditingTodo = ST<typeof UpdateEditingTodo>
type AddTodo = ST<typeof AddTodo>
type DeleteTodo = ST<typeof DeleteTodo>
type ToggleTodo = ST<typeof ToggleTodo>
type StartEditing = ST<typeof StartEditing>
type SaveEdit = ST<typeof SaveEdit>
type CancelEdit = ST<typeof CancelEdit>
type ToggleAll = ST<typeof ToggleAll>
type ClearCompleted = ST<typeof ClearCompleted>
type SetFilter = ST<typeof SetFilter>
type TodosLoaded = ST<typeof TodosLoaded>
type TodosSaved = ST<typeof TodosSaved>

export type Message = ST<typeof Message>

// INIT

const loadTodos: Runtime.Command<TodosLoaded> = Effect.gen(function* () {
  const storedTodos = yield* Effect.sync(() => localStorage.getItem('todos'))

  if (!storedTodos) {
    return TodosLoaded.make({ todos: [] })
  }

  const parsed = yield* Effect.try(() => JSON.parse(storedTodos))
  const decoded = yield* S.decodeUnknown(Todos)(parsed)

  return TodosLoaded.make({ todos: Array.fromIterable(decoded) })
}).pipe(Effect.catchAll(() => Effect.succeed(TodosLoaded.make({ todos: [] }))))

const init: Runtime.ElementInit<Model, Message> = () => [
  {
    todos: [],
    newTodoText: '',
    filter: 'All',
    editing: NotEditing.make(),
  },
  [loadTodos],
]

const generateId = (): string => Math.random().toString(36).substring(2, 15)

// UPDATE

const update = Fold.fold<Model, Message>({
  NoOp: (model) => [model, []],

  UpdateNewTodo: (model, { text }) => [
    {
      ...model,
      newTodoText: text,
    },
    [],
  ],

  UpdateEditingTodo: (model, { text }) => [
    {
      ...model,
      editing: Match.value(model.editing).pipe(
        Match.tagsExhaustive({
          NotEditing: () => model.editing,
          Editing: ({ id }) => Editing.make({ id, text }),
        }),
      ),
    },
    [],
  ],

  AddTodo: (model) => {
    if (String.isEmpty(String.trim(model.newTodoText))) {
      return [model, []]
    }

    const newTodo: Todo = {
      id: generateId(),
      text: String.trim(model.newTodoText),
      completed: false,
      createdAt: Date.now(),
    }

    const updatedTodos = Array.append(model.todos, newTodo)

    return [
      {
        ...model,
        todos: updatedTodos,
        newTodoText: '',
      },
      [saveTodos(updatedTodos)],
    ]
  },

  DeleteTodo: (model, { id }) => {
    const updatedTodos = Array.filter(model.todos, (todo) => todo.id !== id)

    return [
      {
        ...model,
        todos: updatedTodos,
      },
      [saveTodos(updatedTodos)],
    ]
  },

  ToggleTodo: (model, { id }) => {
    const updatedTodos = Array.map(model.todos, (todo) =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo,
    )

    return [
      {
        ...model,
        todos: updatedTodos,
      },
      [saveTodos(updatedTodos)],
    ]
  },

  StartEditing: (model, { id }) => {
    const todo = Array.findFirst(model.todos, (t) => t.id === id)
    return [
      {
        ...model,
        editing: Editing.make({
          id,
          text: Option.match(todo, {
            onNone: () => '',
            onSome: (t) => t.text,
          }),
        }),
      },
      [],
    ]
  },

  SaveEdit: (model) =>
    Match.value(model.editing).pipe(
      Match.withReturnType<[Model, Runtime.Command<TodosSaved>[]]>(),
      Match.tagsExhaustive({
        NotEditing: () => [model, []],

        Editing: ({ id, text }) => {
          if (String.isEmpty(String.trim(text))) {
            return [
              {
                ...model,
                editing: NotEditing.make(),
              },
              [],
            ]
          }

          const updatedTodos = Array.map(model.todos, (todo) =>
            todo.id === id ? { ...todo, text: String.trim(text) } : todo,
          )

          return [
            {
              ...model,
              todos: updatedTodos,
              editing: NotEditing.make(),
            },
            [saveTodos(updatedTodos)],
          ]
        },
      }),
    ),

  CancelEdit: (model) => [
    {
      ...model,
      editing: NotEditing.make(),
    },
    [],
  ],

  ToggleAll: (model) => {
    const allCompleted = Array.every(model.todos, (todo) => todo.completed)
    const updatedTodos = Array.map(model.todos, (todo) => ({
      ...todo,
      completed: !allCompleted,
    }))

    return [
      {
        ...model,
        todos: updatedTodos,
      },
      [saveTodos(updatedTodos)],
    ]
  },

  ClearCompleted: (model) => {
    const updatedTodos = Array.filter(model.todos, (todo) => !todo.completed)

    return [
      {
        ...model,
        todos: updatedTodos,
      },
      [saveTodos(updatedTodos)],
    ]
  },

  SetFilter: (model, { filter }) => [
    {
      ...model,
      filter,
    },
    [],
  ],

  TodosLoaded: (model, { todos }) => [
    {
      ...model,
      todos,
    },
    [],
  ],

  TodosSaved: (model, { todos }) => [
    {
      ...model,
      todos,
    },
    [],
  ],
})

// COMMAND

const saveTodos = (todos: Todos): Runtime.Command<TodosSaved> =>
  Effect.gen(function* () {
    yield* Effect.sync(() => localStorage.setItem('todos', JSON.stringify(todos)))
    return TodosSaved.make({ todos })
  }).pipe(Effect.catchAll(() => Effect.succeed(TodosSaved.make({ todos }))))

// VIEW

const todoItemView =
  (model: Model) =>
  (todo: Todo): Html =>
    Match.value(model.editing).pipe(
      Match.tagsExhaustive({
        NotEditing: () => nonEditingTodoView(todo),
        Editing: ({ id, text }) =>
          id === todo.id ? editingTodoView(todo, text) : nonEditingTodoView(todo),
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
        OnChange((text) => UpdateEditingTodo.make({ text })),
      ]),
      button(
        [
          OnClick(SaveEdit.make()),
          Class('px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600'),
        ],
        ['Save'],
      ),
      button(
        [
          OnClick(CancelEdit.make()),
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
        OnClick(ToggleTodo.make({ id: todo.id })),
      ]),
      span(
        [
          Class(`flex-1 ${todo.completed ? 'line-through text-gray-500' : 'text-gray-900'}`),
          OnClick(StartEditing.make({ id: todo.id })),
        ],
        [todo.text],
      ),
      button(
        [
          OnClick(DeleteTodo.make({ id: todo.id })),
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
        OnClick(SetFilter.make({ filter })),
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

const footerView = (model: Model, activeCount: number, completedCount: number): Html =>
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
                      OnClick(ToggleAll.make()),
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
                      OnClick(ClearCompleted.make()),
                      Class('px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200'),
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
  Match.value(filter).pipe(
    Match.when('All', () => todos),
    Match.when('Active', () => Array.filter(todos, (todo) => !todo.completed)),
    Match.when('Completed', () => Array.filter(todos, (todo) => todo.completed)),
    Match.exhaustive,
  )

const view = (model: Model): Html => {
  const filteredTodos = filterTodos(model.todos, model.filter)
  const activeCount = Array.length(Array.filter(model.todos, (todo) => !todo.completed))
  const completedCount = Array.length(model.todos) - activeCount

  return div(
    [Class('min-h-screen bg-gray-100 py-8')],
    [
      div(
        [Class('max-w-md mx-auto bg-white rounded-xl shadow-lg p-6')],
        [
          h1([Class('text-3xl font-bold text-gray-800 text-center mb-8')], ['Todo App']),

          form(
            [Class('mb-6'), OnSubmit(AddTodo.make())],
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
                    OnChange((text) => UpdateNewTodo.make({ text })),
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
                  Match.value(model.filter).pipe(
                    Match.when('All', () => 'No todos yet. Add one above!'),
                    Match.when('Active', () => 'No active todos'),
                    Match.when('Completed', () => 'No completed todos'),
                    Match.exhaustive,
                  ),
                ],
              ),
            onNonEmpty: (todos) =>
              ul([Class('space-y-2 mb-6')], Array.map(todos, todoItemView(model))),
          }),

          footerView(model, activeCount, completedCount),
        ],
      ),
    ],
  )
}

// RUN

const element = Runtime.makeElement({
  Model,
  init,
  update,
  view,
  container: document.getElementById('root')!,
})

Effect.runFork(element)
