import { Array, Data, Effect, Match, Option, Schema, String } from 'effect'
import {
  Class,
  Html,
  OnChange,
  OnSubmit,
  OnClick,
  Placeholder,
  Id,
  For,
  Type,
  Value,
  button,
  div,
  input,
  h1,
  form,
  label,
  ul,
  li,
  span,
  fold,
  makeApp,
  makeCommand,
  updateConstructors,
  Command,
  empty,
  Init,
} from '@foldkit/core'

// MODEL

const TodoSchema = Schema.Struct({
  id: Schema.String,
  text: Schema.String,
  completed: Schema.Boolean,
  createdAt: Schema.Number,
})

type Todo = Schema.Schema.Type<typeof TodoSchema>

type Filter = 'All' | 'Active' | 'Completed'

// TODO: Should making the model fields Readonly be a convention?
type Model = Readonly<{
  todos: Array<Todo>
  newTodoText: string
  filter: Filter
  editingId: Option.Option<string>
  editingText: string
}>

// MESSAGE

type Message = Data.TaggedEnum<{
  NoOp: {}
  UpdateNewTodo: { text: string }
  UpdateEditingTodo: { text: string }

  AddTodo: {}
  DeleteTodo: { id: string }
  ToggleTodo: { id: string }
  StartEditing: { id: string }
  SaveEdit: {}
  CancelEdit: {}

  ToggleAll: {}
  ClearCompleted: {}

  SetFilter: { filter: Filter }

  TodosLoaded: { todos: Array<Todo> }
  TodosSaved: { todos: Array<Todo> }
}>
const Message = Data.taggedEnum<Message>()

const { pure, pureCommand } = updateConstructors<Model, Message>()

// INIT

const loadTodos = makeCommand(
  Effect.gen(function* () {
    const stored = localStorage.getItem('todos')

    if (!stored) {
      return Message.TodosLoaded({ todos: [] })
    }

    const parsed = yield* Effect.try(() => JSON.parse(stored))
    const decoded = yield* Schema.decodeUnknown(Schema.Array(TodoSchema))(parsed)

    return Message.TodosLoaded({ todos: Array.fromIterable(decoded) })
  }).pipe(Effect.catchAll(() => Effect.succeed(Message.TodosLoaded({ todos: [] })))),
)

const init: Init<Model, Message> = () => [
  {
    todos: [],
    newTodoText: '',
    filter: 'All',
    editingId: Option.none(),
    editingText: '',
  },
  Option.some(loadTodos),
]

const generateId = (): string => Math.random().toString(36).substring(2, 15)

// UPDATE

const update = fold<Model, Message>({
  NoOp: pure((model) => model),

  UpdateNewTodo: pure((model, { text }) => ({
    ...model,
    newTodoText: text,
  })),

  UpdateEditingTodo: pure((model, { text }) => ({
    ...model,
    editingText: text,
  })),

  AddTodo: pureCommand((model) => {
    if (String.isEmpty(String.trim(model.newTodoText))) {
      return [model, makeCommand(Effect.succeed(Message.NoOp()))]
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
      saveTodos(updatedTodos),
    ]
  }),

  DeleteTodo: pureCommand((model, { id }) => {
    const updatedTodos = Array.filter(model.todos, (todo) => todo.id !== id)

    return [
      {
        ...model,
        todos: updatedTodos,
      },
      saveTodos(updatedTodos),
    ]
  }),

  ToggleTodo: pureCommand((model, { id }) => {
    const updatedTodos = Array.map(model.todos, (todo) =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo,
    )

    return [
      {
        ...model,
        todos: updatedTodos,
      },
      saveTodos(updatedTodos),
    ]
  }),

  StartEditing: pure((model, { id }) => {
    const todo = Array.findFirst(model.todos, (t) => t.id === id)
    return {
      ...model,
      editingId: Option.some(id),
      editingText: Option.getOrElse(
        Option.map(todo, (t) => t.text),
        () => '',
      ),
    }
  }),

  SaveEdit: pureCommand((model) => {
    const editingId = Option.getOrNull(model.editingId)

    if (!editingId || String.trim(model.editingText) === '') {
      return [
        {
          ...model,
          editingId: Option.none(),
          editingText: '',
        },
        makeCommand(Effect.succeed(Message.NoOp())),
      ]
    }

    const updatedTodos = Array.map(model.todos, (todo) =>
      todo.id === editingId ? { ...todo, text: String.trim(model.editingText) } : todo,
    )

    return [
      {
        ...model,
        todos: updatedTodos,
        editingId: Option.none(),
        editingText: '',
      },
      saveTodos(updatedTodos),
    ]
  }),

  CancelEdit: pure((model) => ({
    ...model,
    editingId: Option.none(),
    editingText: '',
  })),

  ToggleAll: pureCommand((model) => {
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
      saveTodos(updatedTodos),
    ]
  }),

  ClearCompleted: pureCommand((model) => {
    const updatedTodos = Array.filter(model.todos, (todo) => !todo.completed)

    return [
      {
        ...model,
        todos: updatedTodos,
      },
      saveTodos(updatedTodos),
    ]
  }),

  SetFilter: pure((model, { filter }) => ({
    ...model,
    filter,
  })),

  TodosLoaded: pure((model, { todos }) => ({
    ...model,
    todos,
  })),

  TodosSaved: pure((model, { todos }) => ({
    ...model,
    todos,
  })),
})

// COMMAND

const saveTodos = (todos: Array<Todo>): Command<Message> =>
  makeCommand(
    Effect.gen(function* () {
      localStorage.setItem('todos', JSON.stringify(todos))
      return Message.TodosSaved({ todos })
    }).pipe(Effect.catchAll(() => Effect.succeed(Message.TodosSaved({ todos })))),
  )

// VIEW

const todoItemView =
  (model: Model) =>
  (todo: Todo): Html => {
    const isEditing = Option.exists(model.editingId, (id) => id === todo.id)

    if (isEditing) {
      return li(
        [Class('flex items-center gap-3 p-3 bg-gray-50 rounded-lg')],
        [
          input([
            Id(`edit-${todo.id}`),
            Value(model.editingText),
            Class(
              'flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500',
            ),
            OnChange((text) => Message.UpdateEditingTodo({ text })),
          ]),
          button(
            [
              OnClick(Message.SaveEdit()),
              Class('px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600'),
            ],
            ['Save'],
          ),
          button(
            [
              OnClick(Message.CancelEdit()),
              Class('px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600'),
            ],
            ['Cancel'],
          ),
        ],
      )
    }

    return li(
      [Class('flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg group')],
      [
        input([
          Type('checkbox'),
          Id(`todo-${todo.id}`),
          Value(todo.completed ? 'on' : ''),
          Class('w-4 h-4 text-blue-600 rounded focus:ring-blue-500'),
          OnClick(Message.ToggleTodo({ id: todo.id })),
        ]),
        span(
          [
            Class(`flex-1 ${todo.completed ? 'line-through text-gray-500' : 'text-gray-900'}`),
            OnClick(Message.StartEditing({ id: todo.id })),
          ],
          [todo.text],
        ),
        button(
          [
            OnClick(Message.DeleteTodo({ id: todo.id })),
            Class(
              'px-2 py-1 text-red-600 opacity-0 group-hover:opacity-100 hover:bg-red-100 rounded transition-opacity',
            ),
          ],
          ['×'],
        ),
      ],
    )
  }

const filterButtonView =
  (model: Model) =>
  (filter: Filter, label: string): Html =>
    button(
      [
        OnClick(Message.SetFilter({ filter })),
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
                      OnClick(Message.ToggleAll()),
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
                      OnClick(Message.ClearCompleted()),
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

const filterTodos = (todos: Array<Todo>, filter: Filter): Array<Todo> =>
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
            [Class('mb-6'), OnSubmit(Message.AddTodo())],
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
                    OnChange((text) => Message.UpdateNewTodo({ text })),
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
                  model.filter === 'All'
                    ? 'No todos yet. Add one above!'
                    : model.filter === 'Active'
                      ? 'No active todos'
                      : 'No completed todos',
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

const app = makeApp({
  init,
  update,
  view,
  container: document.body,
})

Effect.runFork(app)
