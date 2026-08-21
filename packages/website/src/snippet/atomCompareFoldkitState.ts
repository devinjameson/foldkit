import { Array, Schema as S } from 'effect'
import { Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

// MODEL

const Filter = S.Literals(['All', 'Active', 'Done'])

export const Model = S.Struct({
  todos: S.Array(Todo),
  filter: Filter,
})
type Model = typeof Model.Type

// MESSAGE

const Message = defineMessageUnion({
  AddedTodo: {},
  ClearedDoneTodos: {},
  SelectedFilter: { filter: Filter },
})
type Message = typeof Message.Type

// UPDATE

export const update = (model: Model, message: Message) =>
  Message.match<readonly [Model, ReadonlyArray<Command.Command<Message>>]>(
    message,
    {
      AddedTodo: () => [evo(model, { todos: Array.append(emptyTodo()) }), []],
      ClearedDoneTodos: () => [
        evo(model, { todos: Array.filter(todo => !todo.done) }),
        [],
      ],
      SelectedFilter: ({ filter }) => [
        evo(model, { filter: () => filter }),
        [],
      ],
    },
  )
