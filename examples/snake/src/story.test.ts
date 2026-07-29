import { Command, given, message, model, story } from 'foldkit/story'
import { describe, expect, test } from 'vitest'

import { Snake } from './domain'
import {
  CompletedGenerateApplePosition,
  GenerateApplePosition,
  type Model,
  PressedKey,
  TickedClock,
  update,
} from './main'

const initialSnake = Snake.create({ x: 10, y: 10 })

const playingModel: Model = {
  snake: initialSnake,
  apple: { x: 15, y: 15 },
  direction: 'Right',
  nextDirection: 'Right',
  gameState: 'Playing',
  points: 0,
  highScore: 0,
}

const notStartedModel: Model = {
  ...playingModel,
  gameState: 'NotStarted',
}

describe('update', () => {
  describe('movement controls', () => {
    test('arrow key updates nextDirection while playing', () => {
      story(
        update,
        given(playingModel),
        message(PressedKey({ key: 'ArrowUp' })),
        model(model => {
          expect(model.nextDirection).toBe('Up')
        }),
      )
    })

    test('WASD key updates nextDirection while playing', () => {
      story(
        update,
        given(playingModel),
        message(PressedKey({ key: 'a' })),
        model(model => {
          expect(model.nextDirection).toBe('Left')
        }),
      )
    })

    test('arrow keys are ignored while the game is paused', () => {
      story(
        update,
        given({ ...playingModel, gameState: 'Paused' }),
        message(PressedKey({ key: 'ArrowDown' })),
        model(model => {
          expect(model.nextDirection).toBe('Right')
        }),
      )
    })
  })

  describe('space key', () => {
    test('SPACE starts the game from NotStarted', () => {
      story(
        update,
        given(notStartedModel),
        message(PressedKey({ key: ' ' })),
        model(model => {
          expect(model.gameState).toBe('Playing')
        }),
      )
    })

    test('SPACE pauses the game when Playing', () => {
      story(
        update,
        given(playingModel),
        message(PressedKey({ key: ' ' })),
        model(model => {
          expect(model.gameState).toBe('Paused')
        }),
      )
    })

    test('SPACE on GameOver does nothing', () => {
      story(
        update,
        given({ ...playingModel, gameState: 'GameOver' }),
        message(PressedKey({ key: ' ' })),
        model(model => {
          expect(model.gameState).toBe('GameOver')
        }),
      )
    })
  })

  describe('restart', () => {
    test('R fires GenerateApplePosition and resets the snake', () => {
      story(
        update,
        given({ ...playingModel, points: 100 }),
        message(PressedKey({ key: 'r' })),
        model(model => {
          expect(model.gameState).toBe('NotStarted')
          expect(model.points).toBe(0)
          expect(model.direction).toBe('Right')
        }),
        Command.expectHas(GenerateApplePosition),
        Command.resolve(
          GenerateApplePosition,
          CompletedGenerateApplePosition({ position: { x: 5, y: 5 } }),
        ),
        model(model => {
          expect(model.apple).toEqual({ x: 5, y: 5 })
        }),
      )
    })
  })

  describe('TickedClock', () => {
    test('moves the snake one cell while Playing', () => {
      story(
        update,
        given(playingModel),
        message(TickedClock()),
        model(model => {
          expect(model.snake[0]).toEqual({ x: 11, y: 10 })
        }),
      )
    })

    test('does nothing when not Playing', () => {
      story(
        update,
        given(notStartedModel),
        message(TickedClock()),
        model(model => {
          expect(model.snake).toEqual(initialSnake)
        }),
      )
    })

    test('eating an apple grows the snake, adds points, and requests a new apple', () => {
      const aboutToEatModel: Model = {
        ...playingModel,
        apple: { x: 11, y: 10 },
      }
      const lengthBefore = aboutToEatModel.snake.length

      story(
        update,
        given(aboutToEatModel),
        message(TickedClock()),
        Command.expectHas(GenerateApplePosition),
        Command.resolve(
          GenerateApplePosition,
          CompletedGenerateApplePosition({ position: { x: 5, y: 5 } }),
        ),
        model(model => {
          expect(model.snake.length).toBe(lengthBefore + 1)
          expect(model.points).toBe(10)
          expect(model.apple).toEqual({ x: 5, y: 5 })
        }),
      )
    })
  })
})
