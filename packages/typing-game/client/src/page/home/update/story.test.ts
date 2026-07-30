import { Option } from 'effect'
import {
  Command,
  expectOutMessage,
  given,
  message,
  model,
  story,
} from 'foldkit/story'
import { describe, expect, test } from 'vitest'

import {
  CreateRoom,
  FocusRoomIdInput,
  FocusUsernameInput,
  JoinRoom,
} from '../command'
import {
  ChangedRoomId,
  ChangedUsername,
  CompletedFocusRoomIdInput,
  CompletedFocusUsernameInput,
  FailedJoinRoom,
  PressedKey,
  SubmittedJoinRoomForm,
  SubmittedUsernameForm,
  SucceededCreateRoom,
  SucceededJoinRoom,
} from '../message'
import { EnterRoomId, EnterUsername, SelectAction } from '../model'
import { update } from './update'

const alice = { id: 'p1', username: 'alice' }

const givenEnterUsernameStep = () =>
  given({
    homeStep: EnterUsername({ username: '' }),
    formError: Option.none(),
  })

const givenSelectActionStep = () =>
  given({
    homeStep: SelectAction({
      username: 'alice',
      selectedAction: 'CreateRoom',
    }),
    formError: Option.none(),
  })

const givenEnterRoomIdStep = () =>
  given({
    homeStep: EnterRoomId({ username: 'alice', roomId: '' }),
    formError: Option.none(),
  })

describe('entering a username', () => {
  test('typing updates the username', () => {
    story(
      update,
      givenEnterUsernameStep(),
      message(ChangedUsername({ value: 'alice' })),
      model(model => {
        expect(model.homeStep).toMatchObject({
          _tag: 'EnterUsername',
          username: 'alice',
        })
      }),
    )
  })

  test('submitting advances to action selection', () => {
    story(
      update,
      givenEnterUsernameStep(),
      message(ChangedUsername({ value: 'alice' })),
      message(SubmittedUsernameForm()),
      model(model => {
        expect(model.homeStep).toMatchObject({
          _tag: 'SelectAction',
          username: 'alice',
          selectedAction: 'CreateRoom',
        })
      }),
    )
  })

  test('submitting with an empty username does nothing', () => {
    story(
      update,
      givenEnterUsernameStep(),
      message(SubmittedUsernameForm()),
      model(model => {
        expect(model.homeStep._tag).toBe('EnterUsername')
      }),
    )
  })
})

describe('selecting an action', () => {
  test('ArrowDown cycles through actions with wraparound', () => {
    story(
      update,
      givenSelectActionStep(),
      message(PressedKey({ key: 'ArrowDown' })),
      model(model => {
        expect(model.homeStep).toMatchObject({
          _tag: 'SelectAction',
          selectedAction: 'JoinRoom',
        })
      }),
      message(PressedKey({ key: 'ArrowDown' })),
      model(model => {
        expect(model.homeStep).toMatchObject({
          _tag: 'SelectAction',
          selectedAction: 'ChangeUsername',
        })
      }),
      message(PressedKey({ key: 'ArrowDown' })),
      model(model => {
        expect(model.homeStep).toMatchObject({
          _tag: 'SelectAction',
          selectedAction: 'CreateRoom',
        })
      }),
    )
  })

  test('ArrowUp wraps from first to last', () => {
    story(
      update,
      givenSelectActionStep(),
      message(PressedKey({ key: 'ArrowUp' })),
      model(model => {
        expect(model.homeStep).toMatchObject({
          _tag: 'SelectAction',
          selectedAction: 'ChangeUsername',
        })
      }),
    )
  })

  test('selecting JoinRoom transitions to room ID input', () => {
    story(
      update,
      givenSelectActionStep(),
      message(PressedKey({ key: 'ArrowDown' })),
      message(PressedKey({ key: 'Enter' })),
      Command.resolve(FocusRoomIdInput, CompletedFocusRoomIdInput()),
      model(model => {
        expect(model.homeStep).toMatchObject({
          _tag: 'EnterRoomId',
          username: 'alice',
          roomId: '',
        })
      }),
    )
  })

  test('selecting ChangeUsername goes back to username input', () => {
    story(
      update,
      givenSelectActionStep(),
      message(PressedKey({ key: 'ArrowDown' })),
      message(PressedKey({ key: 'ArrowDown' })),
      message(PressedKey({ key: 'Enter' })),
      Command.resolve(FocusUsernameInput, CompletedFocusUsernameInput()),
      model(model => {
        expect(model.homeStep._tag).toBe('EnterUsername')
      }),
    )
  })

  test('selecting CreateRoom creates the room and signals the parent', () => {
    story(
      update,
      givenSelectActionStep(),
      message(PressedKey({ key: 'Enter' })),
      Command.resolve(
        CreateRoom,
        SucceededCreateRoom({ roomId: 'r1', player: alice }),
      ),
      expectOutMessage(SucceededCreateRoom({ roomId: 'r1', player: alice })),
    )
  })
})

describe('joining a room', () => {
  test('typing a room ID updates the model', () => {
    story(
      update,
      givenEnterRoomIdStep(),
      message(ChangedRoomId({ value: 'abc' })),
      model(model => {
        expect(model.homeStep).toMatchObject({
          _tag: 'EnterRoomId',
          roomId: 'abc',
        })
      }),
    )
  })

  test('typing clears a previous error', () => {
    story(
      update,
      given({
        homeStep: EnterRoomId({ username: 'alice', roomId: '' }),
        formError: Option.some('Room not found'),
      }),
      message(ChangedRoomId({ value: 'abc' })),
      model(model => {
        expect(Option.isNone(model.formError)).toBe(true)
      }),
    )
  })

  test('submitting joins the room and signals the parent', () => {
    story(
      update,
      givenEnterRoomIdStep(),
      message(ChangedRoomId({ value: 'r1' })),
      message(SubmittedJoinRoomForm()),
      Command.resolve(
        JoinRoom,
        SucceededJoinRoom({ roomId: 'r1', player: alice }),
      ),
      expectOutMessage(SucceededJoinRoom({ roomId: 'r1', player: alice })),
    )
  })

  test('a failed join sets the error', () => {
    story(
      update,
      givenEnterRoomIdStep(),
      message(FailedJoinRoom({ error: 'Room not found' })),
      model(model => {
        expect(model.formError).toMatchObject({
          _tag: 'Some',
          value: 'Room not found',
        })
      }),
    )
  })

  test('typing "exit" goes back to action selection', () => {
    story(
      update,
      givenEnterRoomIdStep(),
      message(ChangedRoomId({ value: 'exit' })),
      message(SubmittedJoinRoomForm()),
      model(model => {
        expect(model.homeStep).toMatchObject({
          _tag: 'SelectAction',
          selectedAction: 'JoinRoom',
        })
      }),
    )
  })
})
