import { Match as M, Option } from 'effect'
import { Command } from 'foldkit'
import { Transition } from 'foldkit/route'

type Commands = ReadonlyArray<Command.Command<Message>>

const commandsForTransition = (
  transition: Transition.Transition<AppRoute>,
): Commands =>
  Option.match(Transition.enteredAny(transition), {
    onNone: () => [],
    onSome: M.type<AppRoute>().pipe(
      M.withReturnType<Commands>(),
      M.tag('People', () => [FetchPeopleFilters()]),
      M.tag('Person', ({ personId }) => [FetchPerson({ personId })]),
      M.orElse(() => []),
    ),
  })
