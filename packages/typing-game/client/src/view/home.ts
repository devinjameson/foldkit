import { Array, Match as M, Option } from 'effect'
import { Html } from 'foldkit/html'

import { ROOM_ID_INPUT_ID, USERNAME_INPUT_ID } from '../constant'
import {
  JoinRoomClicked,
  RoomIdInputBlurred,
  RoomIdInputted,
  UsernameFormSubmitted,
  UsernameInputBlurred,
  UsernameInputted,
} from '../message'
import {
  EnterRoomId,
  EnterUsername,
  HOME_ACTIONS,
  HomeAction,
  Model,
  SelectAction,
  homeActionToLabel,
} from '../model'
import {
  Autocapitalize,
  Autocomplete,
  Autocorrect,
  Class,
  Id,
  OnBlur,
  OnInput,
  OnSubmit,
  Spellcheck,
  Type,
  Value,
  div,
  empty,
  form,
  input,
  span,
} from './html'

export const home = (model: Model): Html =>
  div(
    [Class('min-h-screen p-12')],
    [
      div(
        [Class('max-w-4xl')],
        [
          div([Class('mb-6 uppercase')], ['Typing Terminal']),

          M.value(model.homeStep).pipe(
            M.tagsExhaustive({
              EnterUsername: enterUsername,
              SelectAction: selectAction,
              EnterRoomId: enterRoomId,
            }),
          ),

          maybeErrorMessage(model.roomFormError),
        ],
      ),
    ],
  )

const enterUsername = ({ username }: EnterUsername): Html =>
  form(
    [OnSubmit(UsernameFormSubmitted.make())],
    [
      div(
        [Class('flex items-center gap-2')],
        [
          span([], ['Enter username: ']),
          div(
            [Class('flex items-center gap-2 flex-1')],
            [
              input([
                Id(USERNAME_INPUT_ID),
                Type('text'),
                Value(username),
                Class('bg-transparent px-0 py-2 outline-none w-full'),
                OnInput((value) => UsernameInputted.make({ value })),
                OnBlur(UsernameInputBlurred.make()),
                Autocapitalize('none'),
                Spellcheck(false),
                Autocorrect('off'),
                Autocomplete('off'),
              ]),
            ],
          ),
        ],
      ),
    ],
  )

const selectAction = ({ selectedAction }: SelectAction): Html =>
  div([Class('space-y-4')], Array.map(HOME_ACTIONS, action(selectedAction)))

const action =
  (selectedAction: HomeAction) =>
  (homeAction: HomeAction): Html =>
    div(
      [Class('whitespace-pre-wrap')],
      [selectedAction === homeAction ? '> ' : '  ', homeActionToLabel(homeAction)],
    )

const enterRoomId = ({ roomId }: EnterRoomId): Html =>
  form(
    [OnSubmit(JoinRoomClicked.make())],
    [
      div(
        [Class('flex items-center gap-2')],
        [
          span([], ['Enter room ID: ']),
          div(
            [Class('flex items-center gap-2 flex-1')],
            [
              input([
                Id(ROOM_ID_INPUT_ID),
                Type('text'),
                Value(roomId),
                Class('bg-transparent px-0 py-2 outline-none w-full'),
                OnInput((value) => RoomIdInputted.make({ value })),
                OnBlur(RoomIdInputBlurred.make()),
                Autocapitalize('none'),
                Spellcheck(false),
                Autocorrect('off'),
                Autocomplete('off'),
              ]),
            ],
          ),
        ],
      ),
    ],
  )

const maybeErrorMessage = (maybeRoomFormError: Option.Option<string>) =>
  Option.match(maybeRoomFormError, {
    onNone: () => empty,
    onSome: (errorMessage) =>
      div(
        [Class('mt-6')],
        [
          span([Class('text-terminal-red uppercase')], ['[Error] ']),
          span([Class('text-terminal-red')], [errorMessage]),
        ],
      ),
  })
