import { describe, it } from '@effect/vitest'
import { Option, Schema as S } from 'effect'
import { expect } from 'vitest'

import {
  type Validation,
  between,
  email,
  endsWith,
  equals,
  includes,
  integer,
  makeField,
  max,
  maxLength,
  min,
  minLength,
  nonNegative,
  oneOf,
  pattern,
  positive,
  required,
  startsWith,
  url,
  validateField,
} from './fieldValidation'

describe('makeField', () => {
  const StringField = makeField(S.String)

  it('creates NotValidated via schema make', () => {
    const field = StringField.NotValidated.make({ value: 'hello' })
    expect(field._tag).toBe('NotValidated')
    expect(field.value).toBe('hello')
  })

  it('creates Validating via schema make', () => {
    const field = StringField.Validating.make({ value: 'hello' })
    expect(field._tag).toBe('Validating')
    expect(field.value).toBe('hello')
  })

  it('creates Valid via schema make', () => {
    const field = StringField.Valid.make({ value: 'hello' })
    expect(field._tag).toBe('Valid')
    expect(field.value).toBe('hello')
  })

  it('creates Invalid via schema make', () => {
    const field = StringField.Invalid.make({ value: 'hello', error: 'bad' })
    expect(field._tag).toBe('Invalid')
    expect(field.value).toBe('hello')
    expect(field.error).toBe('bad')
  })

  it('Union schema decodes NotValidated', () => {
    const result = S.decodeUnknownOption(StringField.Union)({
      _tag: 'NotValidated',
      value: 'hi',
    })
    expect(Option.isSome(result)).toBe(true)
  })

  it('Union schema decodes Invalid', () => {
    const result = S.decodeUnknownOption(StringField.Union)({
      _tag: 'Invalid',
      value: 'hi',
      error: 'bad',
    })
    expect(Option.isSome(result)).toBe(true)
  })

  it('Union schema rejects unknown tags', () => {
    const result = S.decodeUnknownOption(StringField.Union)({
      _tag: 'Unknown',
      value: 'hi',
    })
    expect(Option.isNone(result)).toBe(true)
  })

  it('works with non-string value schemas', () => {
    const NumberField = makeField(S.Number)
    const field = NumberField.Valid.make({ value: 42 })
    expect(field._tag).toBe('Valid')
    expect(field.value).toBe(42)
  })
})

describe('string validators', () => {
  describe('required', () => {
    it('fails for empty string', () => {
      const [predicate] = required()
      expect(predicate('')).toBe(false)
    })

    it('passes for non-empty string', () => {
      const [predicate] = required()
      expect(predicate('test')).toBe(true)
    })

    it('uses default message', () => {
      const [, message] = required()
      expect(message).toBe('Required')
    })

    it('accepts custom message', () => {
      const [, message] = required('Email is required')
      expect(message).toBe('Email is required')
    })
  })

  describe('minLength', () => {
    it('fails below minimum', () => {
      const [predicate] = minLength(3)
      expect(predicate('ab')).toBe(false)
    })

    it('passes at minimum', () => {
      const [predicate] = minLength(3)
      expect(predicate('abc')).toBe(true)
    })

    it('passes above minimum', () => {
      const [predicate] = minLength(3)
      expect(predicate('abcd')).toBe(true)
    })

    it('uses default message', () => {
      const [, message] = minLength(3)
      expect(message).toBe('Must be at least 3 characters')
    })

    it('accepts custom message', () => {
      const [, message] = minLength(3, 'Too short')
      expect(message).toBe('Too short')
    })
  })

  describe('maxLength', () => {
    it('fails above maximum', () => {
      const [predicate] = maxLength(5)
      expect(predicate('toolong')).toBe(false)
    })

    it('passes at maximum', () => {
      const [predicate] = maxLength(5)
      expect(predicate('hello')).toBe(true)
    })

    it('passes below maximum', () => {
      const [predicate] = maxLength(5)
      expect(predicate('hi')).toBe(true)
    })

    it('uses default message', () => {
      const [, message] = maxLength(5)
      expect(message).toBe('Must be at most 5 characters')
    })

    it('accepts custom message', () => {
      const [, message] = maxLength(5, 'Too long')
      expect(message).toBe('Too long')
    })
  })

  describe('pattern', () => {
    const hexRegex = /^#[0-9a-f]{6}$/i

    it('fails for non-matching string', () => {
      const [predicate] = pattern(hexRegex)
      expect(predicate('red')).toBe(false)
    })

    it('passes for matching string', () => {
      const [predicate] = pattern(hexRegex)
      expect(predicate('#ff00aa')).toBe(true)
    })

    it('uses default message', () => {
      const [, message] = pattern(hexRegex)
      expect(message).toBe('Invalid format')
    })

    it('accepts custom message', () => {
      const [, message] = pattern(hexRegex, 'Must be a hex color')
      expect(message).toBe('Must be a hex color')
    })
  })

  describe('email', () => {
    it('fails for non-email string', () => {
      const [predicate] = email()
      expect(predicate('not-an-email')).toBe(false)
    })

    it('passes for valid email', () => {
      const [predicate] = email()
      expect(predicate('user@example.com')).toBe(true)
    })

    it('uses default message', () => {
      const [, message] = email()
      expect(message).toBe('Invalid email address')
    })

    it('accepts custom message', () => {
      const [, message] = email('Bad email')
      expect(message).toBe('Bad email')
    })
  })

  describe('url', () => {
    it('fails for non-URL string', () => {
      const [predicate] = url()
      expect(predicate('not a url')).toBe(false)
    })

    it('passes for http URL', () => {
      const [predicate] = url()
      expect(predicate('http://example.com')).toBe(true)
    })

    it('passes for https URL', () => {
      const [predicate] = url()
      expect(predicate('https://example.com/path')).toBe(true)
    })

    it('uses default message', () => {
      const [, message] = url()
      expect(message).toBe('Invalid URL')
    })

    it('accepts custom message', () => {
      const [, message] = url('Enter a valid link')
      expect(message).toBe('Enter a valid link')
    })
  })

  describe('startsWith', () => {
    it('fails when prefix missing', () => {
      const [predicate] = startsWith('https://')
      expect(predicate('http://example.com')).toBe(false)
    })

    it('passes when prefix present', () => {
      const [predicate] = startsWith('https://')
      expect(predicate('https://example.com')).toBe(true)
    })

    it('uses default message', () => {
      const [, message] = startsWith('https://')
      expect(message).toBe('Must start with https://')
    })

    it('accepts custom message', () => {
      const [, message] = startsWith('https://', 'Needs HTTPS')
      expect(message).toBe('Needs HTTPS')
    })
  })

  describe('endsWith', () => {
    it('fails when suffix missing', () => {
      const [predicate] = endsWith('.com')
      expect(predicate('example.org')).toBe(false)
    })

    it('passes when suffix present', () => {
      const [predicate] = endsWith('.com')
      expect(predicate('example.com')).toBe(true)
    })

    it('uses default message', () => {
      const [, message] = endsWith('.com')
      expect(message).toBe('Must end with .com')
    })

    it('accepts custom message', () => {
      const [, message] = endsWith('.com', 'Only .com domains')
      expect(message).toBe('Only .com domains')
    })
  })

  describe('includes', () => {
    it('fails when substring missing', () => {
      const [predicate] = includes('@')
      expect(predicate('hello')).toBe(false)
    })

    it('passes when substring present', () => {
      const [predicate] = includes('@')
      expect(predicate('user@test')).toBe(true)
    })

    it('uses default message', () => {
      const [, message] = includes('@')
      expect(message).toBe('Must contain @')
    })

    it('accepts custom message', () => {
      const [, message] = includes('@', 'Needs an @ sign')
      expect(message).toBe('Needs an @ sign')
    })
  })

  describe('equals', () => {
    it('fails on mismatch', () => {
      const [predicate] = equals('DELETE')
      expect(predicate('delete')).toBe(false)
    })

    it('passes on exact match', () => {
      const [predicate] = equals('DELETE')
      expect(predicate('DELETE')).toBe(true)
    })

    it('uses default message', () => {
      const [, message] = equals('DELETE')
      expect(message).toBe('Must match DELETE')
    })

    it('accepts custom message', () => {
      const [, message] = equals('DELETE', 'Type DELETE to confirm')
      expect(message).toBe('Type DELETE to confirm')
    })
  })
})

describe('number validators', () => {
  describe('min', () => {
    it('fails below minimum', () => {
      const [predicate] = min(5)
      expect(predicate(4)).toBe(false)
    })

    it('passes at minimum', () => {
      const [predicate] = min(5)
      expect(predicate(5)).toBe(true)
    })

    it('uses default message', () => {
      const [, message] = min(5)
      expect(message).toBe('Must be at least 5')
    })

    it('accepts custom message', () => {
      const [, message] = min(5, 'Too low')
      expect(message).toBe('Too low')
    })
  })

  describe('max', () => {
    it('fails above maximum', () => {
      const [predicate] = max(10)
      expect(predicate(11)).toBe(false)
    })

    it('passes at maximum', () => {
      const [predicate] = max(10)
      expect(predicate(10)).toBe(true)
    })

    it('uses default message', () => {
      const [, message] = max(10)
      expect(message).toBe('Must be at most 10')
    })

    it('accepts custom message', () => {
      const [, message] = max(10, 'Too high')
      expect(message).toBe('Too high')
    })
  })

  describe('between', () => {
    it('fails below range', () => {
      const [predicate] = between(1, 10)
      expect(predicate(0)).toBe(false)
    })

    it('fails above range', () => {
      const [predicate] = between(1, 10)
      expect(predicate(11)).toBe(false)
    })

    it('passes at lower bound', () => {
      const [predicate] = between(1, 10)
      expect(predicate(1)).toBe(true)
    })

    it('passes at upper bound', () => {
      const [predicate] = between(1, 10)
      expect(predicate(10)).toBe(true)
    })

    it('passes within range', () => {
      const [predicate] = between(1, 10)
      expect(predicate(5)).toBe(true)
    })

    it('uses default message', () => {
      const [, message] = between(1, 10)
      expect(message).toBe('Must be between 1 and 10')
    })

    it('accepts custom message', () => {
      const [, message] = between(1, 10, 'Out of range')
      expect(message).toBe('Out of range')
    })
  })

  describe('positive', () => {
    it('fails for zero', () => {
      const [predicate] = positive()
      expect(predicate(0)).toBe(false)
    })

    it('fails for negative', () => {
      const [predicate] = positive()
      expect(predicate(-1)).toBe(false)
    })

    it('passes for positive', () => {
      const [predicate] = positive()
      expect(predicate(1)).toBe(true)
    })

    it('uses default message', () => {
      const [, message] = positive()
      expect(message).toBe('Must be positive')
    })

    it('accepts custom message', () => {
      const [, message] = positive('Needs to be > 0')
      expect(message).toBe('Needs to be > 0')
    })
  })

  describe('nonNegative', () => {
    it('fails for negative', () => {
      const [predicate] = nonNegative()
      expect(predicate(-1)).toBe(false)
    })

    it('passes for zero', () => {
      const [predicate] = nonNegative()
      expect(predicate(0)).toBe(true)
    })

    it('passes for positive', () => {
      const [predicate] = nonNegative()
      expect(predicate(5)).toBe(true)
    })

    it('uses default message', () => {
      const [, message] = nonNegative()
      expect(message).toBe('Must be non-negative')
    })

    it('accepts custom message', () => {
      const [, message] = nonNegative('No negatives')
      expect(message).toBe('No negatives')
    })
  })

  describe('integer', () => {
    it('fails for float', () => {
      const [predicate] = integer()
      expect(predicate(3.5)).toBe(false)
    })

    it('passes for whole number', () => {
      const [predicate] = integer()
      expect(predicate(3)).toBe(true)
    })

    it('passes for zero', () => {
      const [predicate] = integer()
      expect(predicate(0)).toBe(true)
    })

    it('passes for negative integer', () => {
      const [predicate] = integer()
      expect(predicate(-2)).toBe(true)
    })

    it('uses default message', () => {
      const [, message] = integer()
      expect(message).toBe('Must be a whole number')
    })

    it('accepts custom message', () => {
      const [, message] = integer('No decimals')
      expect(message).toBe('No decimals')
    })
  })
})

describe('generic validators', () => {
  describe('oneOf', () => {
    const colors = ['red', 'green', 'blue']

    it('fails for value not in set', () => {
      const [predicate] = oneOf(colors)
      expect(predicate('yellow')).toBe(false)
    })

    it('passes for value in set', () => {
      const [predicate] = oneOf(colors)
      expect(predicate('red')).toBe(true)
    })

    it('uses default message', () => {
      const [, message] = oneOf(colors)
      expect(message).toBe('Must be one of: red, green, blue')
    })

    it('accepts custom message', () => {
      const [, message] = oneOf(colors, 'Pick a color')
      expect(message).toBe('Pick a color')
    })
  })
})

describe('validateField', () => {
  const validations: ReadonlyArray<Validation<string>> = [
    required('Name is required'),
    minLength(2, 'At least 2 chars'),
  ]
  const validate = validateField(validations)

  it('returns Valid when all validations pass', () => {
    const result = validate('hello')
    expect(result._tag).toBe('Valid')
    expect(result.value).toBe('hello')
  })

  it('returns Invalid with first failing validation message', () => {
    const result = validate('')
    expect(result._tag).toBe('Invalid')
    if (result._tag === 'Invalid') {
      expect(result.error).toBe('Name is required')
    }
  })

  it('stops at the first failure', () => {
    const result = validate('a')
    expect(result._tag).toBe('Invalid')
    if (result._tag === 'Invalid') {
      expect(result.error).toBe('At least 2 chars')
    }
  })

  it('returns Valid for empty validations', () => {
    const noValidations = validateField<string>([])
    const result = noValidations('anything')
    expect(result._tag).toBe('Valid')
  })
})
