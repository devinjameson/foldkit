import { Match as M, Option } from 'effect'
import { Html } from 'foldkit/html'

import { SESSION_ID_INPUT_ID, USERNAME_INPUT_ID } from '../constant'
import {
  JoinRoomClicked,
  RoomIdInputted,
  SessionIdInputBlurred,
  UsernameFormSubmitted,
  UsernameInputBlurred,
  UsernameInputted,
} from '../message'
import { Model } from '../model'
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
    [Class('min-h-screen p-8')],
    [
      div(
        [Class('max-w-4xl')],
        [
          div([Class('mb-2 uppercase')], ['Miney Miney Tiny Type Town']),

          M.value(model.homeStep).pipe(
            M.tagsExhaustive({
              EnterUsername: ({ username }) =>
                form(
                  [OnSubmit(UsernameFormSubmitted.make())],
                  [
                    div(
                      [Class('flex items-center gap-2')],
                      [
                        span([Class('text-3xl')], ['Enter username: ']),
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
                ),

              SelectAction: ({ selectedAction }) =>
                div(
                  [Class('space-y-2')],
                  [
                    div(
                      [],
                      [
                        div(
                          [Class('text-3xl whitespace-pre-wrap')],
                          [selectedAction === 'CreateRoom' ? '> ' : '  ', 'Create room'],
                        ),
                      ],
                    ),
                    div(
                      [],
                      [
                        div(
                          [Class('text-3xl whitespace-pre-wrap')],
                          [selectedAction === 'JoinRoom' ? '> ' : '  ', 'Join room'],
                        ),
                      ],
                    ),
                    div(
                      [],
                      [
                        div(
                          [Class('text-3xl whitespace-pre-wrap')],
                          [selectedAction === 'ChangeUsername' ? '> ' : '  ', 'Change username'],
                        ),
                      ],
                    ),
                  ],
                ),

              EnterSessionId: ({ sessionId }) =>
                div(
                  [],
                  [
                    div([Class('text-3xl uppercase mb-4')], ['Enter room ID:']),
                    form(
                      [OnSubmit(JoinRoomClicked.make())],
                      [
                        div(
                          [Class('flex items-center gap-2')],
                          [
                            input([
                              Id(SESSION_ID_INPUT_ID),
                              Type('text'),
                              Value(sessionId),
                              Class('bg-transparent px-0 py-2 outline-none w-full'),
                              OnInput((value) => RoomIdInputted.make({ value })),
                              OnBlur(SessionIdInputBlurred.make()),
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
                ),
            }),
          ),

          Option.match(model.roomFormError, {
            onNone: () => empty,
            onSome: (errorMessage) =>
              div(
                [Class('mt-6 border-2 border-terminal-red p-4')],
                [span([Class('text-terminal-red text-3xl')], ['[ERROR] ', errorMessage])],
              ),
          }),
        ],
      ),
    ],
  )
