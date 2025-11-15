import * as Shared from '@typing-game/shared'
import { Match as M, Option } from 'effect'
import { Html } from 'foldkit/html'

import { ROOM_PAGE_USERNAME_INPUT_ID } from '../../constant'
import {
  CopyRoomIdClicked,
  JoinRoomFromPageSubmitted,
  RoomPageUsernameInputBlurred,
  RoomPageUsernameInputted,
} from '../../message'
import { Model, RoomPlayerSession } from '../../model'
import { findFirstWrongCharIndex } from '../../validation'
import {
  AriaLabel,
  Autocapitalize,
  Autocomplete,
  Autocorrect,
  Class,
  Id,
  OnBlur,
  OnClick,
  OnInput,
  OnSubmit,
  Spellcheck,
  Type,
  Value,
  button,
  div,
  empty,
  form,
  input,
  span,
} from '../html'
import { Icon } from '../icon'
import { countdown } from './countdown'
import { finished } from './finished'
import { getReady } from './getReady'
import { playing } from './playing'
import { waiting } from './waiting'

export const room = (model: Model, roomId: string): Html => {
  const maybeError = M.value(model.roomRemoteData).pipe(
    M.tag('Error', ({ error }) => error),
    M.option,
  )

  const copiedIndicator = model.isRoomIdCopyIndicatorVisible
    ? div(
        [
          Class(
            'text-lg rounded py-1 px-2 font-medium bg-terminal-green-dim text-terminal-bg uppercase',
          ),
        ],
        ['Copied'],
      )
    : empty

  const copyButton = button(
    [
      Class(
        'p-2 rounded hover:bg-terminal-green-dim hover:text-terminal-bg transition text-terminal-green',
      ),
      AriaLabel('Copy room ID'),
      OnClick(CopyRoomIdClicked.make({ roomId })),
    ],
    [Icon.copy()],
  )

  return div(
    [Class('min-h-screen p-12')],
    [
      div(
        [Class('max-w-4xl')],
        [
          div([Class('uppercase')], ['[Room id]']),
          div(
            [Class('mb-12 flex items-center gap-2')],
            [span([], [roomId]), copyButton, copiedIndicator],
          ),
          content(model, roomId),
          maybeErrorMessage(maybeError),
        ],
      ),
    ],
  )
}

const content = (
  { roomRemoteData, maybeSession, userText, roomPageUsername }: Model,
  roomId: string,
): Html =>
  M.value(roomRemoteData).pipe(
    M.tagsExhaustive({
      Loading: () => div([], ['Loading...']),
      Error: () => empty,
      Ok: ({ data: room }) =>
        Option.match(maybeSession, {
          onNone: () => joinForm(roomPageUsername, roomId),
          onSome: () => gameContent(room, maybeSession, userText),
        }),
    }),
  )

const gameContent = (
  room: Shared.Room,
  maybeSession: Option.Option<RoomPlayerSession>,
  userText: string,
): Html => {
  const maybeGameText = Option.map(room.maybeGame, ({ text }) => text)
  const maybeWrongCharIndex = Option.flatMap(maybeGameText, findFirstWrongCharIndex(userText))

  return M.value(room.status).pipe(
    M.tagsExhaustive({
      Waiting: () => waiting(room.players, room.hostId, maybeSession),
      GetReady: () => getReady(maybeGameText),
      Countdown: ({ secondsLeft }) => countdown(secondsLeft, maybeGameText),
      Playing: ({ secondsLeft }) =>
        playing(secondsLeft, maybeGameText, userText, maybeWrongCharIndex),
      Finished: () => finished(room.maybeScoreboard, room.hostId, maybeSession),
    }),
  )
}

const joinForm = (username: string, roomId: string): Html =>
  form(
    [OnSubmit(JoinRoomFromPageSubmitted.make({ roomId }))],
    [
      div(
        [Class('flex items-center gap-2')],
        [
          span([], ['Enter username: ']),
          div(
            [Class('flex items-center gap-2 flex-1')],
            [
              input([
                Id(ROOM_PAGE_USERNAME_INPUT_ID),
                Type('text'),
                Value(username),
                Class('bg-transparent px-0 py-2 outline-none w-full'),
                OnInput((value) => RoomPageUsernameInputted.make({ value })),
                OnBlur(RoomPageUsernameInputBlurred.make()),
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
