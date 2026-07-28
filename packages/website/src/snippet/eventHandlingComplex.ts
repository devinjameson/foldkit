import { Match as M, Option } from 'effect'
import type { HtmlBuilder } from 'foldkit/html'

// A handler is a pure translator from event data to a Message.
// It can branch as much as it needs to, with Model-derived state
// in scope.
const searchResultsView = (model: Model, h: HtmlBuilder<Message>) => {
  const handleResultsKeyDown = (key: string): Option.Option<Message> =>
    M.value(key).pipe(
      M.when('Escape', () => Option.some(DismissedResults())),
      M.when('Enter', () =>
        Option.map(model.maybeActiveIndex, index => SelectedResult({ index })),
      ),
      M.when('ArrowDown', () => Option.some(ActivatedNextResult())),
      M.when('ArrowUp', () => Option.some(ActivatedPreviousResult())),
      // Every other key stays with the browser: no Message,
      // no preventDefault.
      M.orElse(() => Option.none()),
    )

  return h.ul(
    [
      h.Role('listbox'),
      h.Tabindex(0),
      h.OnKeyDownPreventDefault(handleResultsKeyDown),
    ],
    model.results.map(result => resultView(result, h)),
  )
}
