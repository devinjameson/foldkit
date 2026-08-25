import { Match as M, Number, Option, String } from 'effect'
import { Update } from 'foldkit'
import { evo } from 'foldkit/struct'

import { Dialog } from '@foldkit/ui'

import {
  FetchSearchResults,
  FocusSearchInput,
  NavigateToResult,
  type PagefindService,
  ScrollToResult,
} from './command'
import { Message } from './message'
import type { Model } from './model'
import { SearchState, resultsFromState } from './model'

export type UpdateReturn = Update.Return<Model, Message, PagefindService>

const foldSearchDialogOutMessage = M.type<Dialog.OutMessage>().pipe(
  M.withReturnType<Update.Step<Model, Message>>(),
  M.tagsExhaustive({
    Opened: () => model => ({ model }),
    Closed: () => model => ({ model }),
  }),
)

const foldSearchDialog = Update.foldChild({
  update: Dialog.update,
  read: (model: Model) => Option.some(model.dialog),
  write: (model, nextDialog) => evo(model, { dialog: () => nextDialog }),
  toParentMessage: message => Message.GotSearchDialogMessage({ message }),
  foldOutMessage: foldSearchDialogOutMessage,
})

const foldSearchDialogOpen: Update.Step<Model, Message> = Update.foldChildStep({
  update: Dialog.open,
  read: (model: Model) => Option.some(model.dialog),
  write: (model, nextDialog) => evo(model, { dialog: () => nextDialog }),
  toParentMessage: message => Message.GotSearchDialogMessage({ message }),
  foldOutMessage: foldSearchDialogOutMessage,
})

const foldSearchDialogClose = Update.foldChildStep({
  update: Dialog.close,
  read: (model: Model) => Option.some(model.dialog),
  write: (model, nextDialog) => evo(model, { dialog: () => nextDialog }),
  toParentMessage: message => Message.GotSearchDialogMessage({ message }),
  foldOutMessage: foldSearchDialogOutMessage,
})

const openSearchDialog = (model: Model): UpdateReturn =>
  Update.combine(model, [
    foldSearchDialogOpen,
    stepModel => ({
      model: stepModel,
      commands: [FocusSearchInput()],
    }),
  ])

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    UpdatedSearchQuery: ({ query }) => {
      if (query === model.query) {
        return { model }
      }

      if (String.isEmpty(query)) {
        return {
          model: evo(model, {
            query: () => '',
            searchState: () => SearchState.Idle(),
            activeResultIndex: () => -1,
          }),
        }
      }

      const previousResults = resultsFromState(model.searchState)

      return {
        model: evo(model, {
          query: () => query,
          searchState: () => SearchState.Loading({ results: previousResults }),
          activeResultIndex: () => -1,
        }),
        commands: [FetchSearchResults({ query })],
      }
    },

    CompletedFetchSearchResults: ({ results, query }) => {
      if (query !== model.query) {
        return { model }
      }

      return {
        model: evo(model, {
          searchState: () => SearchState.Ok({ results }),
          activeResultIndex: () => 0,
        }),
      }
    },

    SelectedSearchResult: ({ url }) => ({
      model: evo(model, {
        query: () => '',
        searchState: () => SearchState.Idle(),
        activeResultIndex: () => -1,
      }),
      commands: [NavigateToResult({ url })],
    }),

    ClickedOpenSearch: () => openSearchDialog(model),

    PressedSearchShortcut: () => openSearchDialog(model),

    GotSearchDialogMessage: ({ message }) =>
      Update.combine(model, [
        foldSearchDialog(message),
        stepModel =>
          message._tag === 'CompletedCloseDialog'
            ? {
                model: evo(stepModel, {
                  query: () => '',
                  searchState: () => SearchState.Idle(),
                  activeResultIndex: () => -1,
                }),
              }
            : { model: stepModel },
      ]),

    ClearedSearchQuery: () => ({
      model: evo(model, {
        query: () => '',
        searchState: () => SearchState.Idle(),
        activeResultIndex: () => -1,
      }),
    }),

    PressedArrowKey: ({ direction }) => {
      const results = resultsFromState(model.searchState)
      const lastIndex = results.length - 1

      const nextIndex = M.value(direction).pipe(
        M.when('Up', () =>
          model.activeResultIndex <= 0
            ? lastIndex
            : Number.decrement(model.activeResultIndex),
        ),
        M.when('Down', () =>
          model.activeResultIndex >= lastIndex
            ? 0
            : Number.increment(model.activeResultIndex),
        ),
        M.exhaustive,
      )

      return {
        model: evo(model, { activeResultIndex: () => nextIndex }),
        commands: [ScrollToResult({ index: nextIndex })],
      }
    },

    CompletedNavigateToResult: () => ({ model }),
    CompletedScrollToResult: () => ({ model }),
    CompletedFocusSearchInput: () => ({ model }),
  })

export const informRouteChanged = (model: Model): UpdateReturn =>
  Update.combine(model, [
    stepModel => update(stepModel, Message.ClearedSearchQuery()),
    foldSearchDialogClose,
  ])
