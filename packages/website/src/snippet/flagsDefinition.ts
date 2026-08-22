import { Effect, Option, Schema as S } from 'effect'
import { KeyValueStore } from 'effect/unstable/persistence'

import { BrowserKeyValueStore } from '@effect/platform-browser'

const Todo = S.Struct({
  id: S.String,
  text: S.String,
  completed: S.Boolean,
})

const Todos = S.Array(Todo)

const TodosJsonString = S.fromJsonString(S.toCodecJson(Todos))

const Flags = S.Struct({
  todos: S.Option(Todos),
})

type Flags = typeof Flags.Type

const flags: Effect.Effect<Flags> = Effect.gen(function* () {
  const store = yield* KeyValueStore.KeyValueStore
  const todosJson = yield* Effect.fromOption(
    Option.fromNullishOr(yield* store.get('todos')),
  )

  const decodeTodos = S.decodeEffect(TodosJsonString)
  const todos = yield* decodeTodos(todosJson)

  return Flags.make({ todos: Option.some(todos) })
}).pipe(
  Effect.catch(() => Effect.succeed(Flags.make({ todos: Option.none() }))),
  Effect.provide(BrowserKeyValueStore.layerLocalStorage),
)
