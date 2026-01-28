import { describe, it } from '@effect/vitest'
import { Option, Schema as S } from 'effect'
import { expect } from 'vitest'

import {
  type Validation,
  makeField,
  minLength,
  regex,
  required,
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
    const result = S.decodeUnknownOption(StringField.Union)({ _tag: 'NotValidated', value: 'hi' })
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
    const result = S.decodeUnknownOption(StringField.Union)({ _tag: 'Unknown', value: 'hi' })
    expect(Option.isNone(result)).toBe(true)
  })

  it('works with non-string value schemas', () => {
    const NumberField = makeField(S.Number)
    const field = NumberField.Valid.make({ value: 42 })
    expect(field._tag).toBe('Valid')
    expect(field.value).toBe(42)
  })
})

describe('required', () => {
  const [predicate, message] = required('Email')

  it('fails for empty string', () => {
    expect(predicate('')).toBe(false)
  })

  it('passes for non-empty string', () => {
    expect(predicate('test')).toBe(true)
  })

  it('includes the field name in the error message', () => {
    expect(message).toBe('Email is required')
  })
})

describe('minLength', () => {
  const [predicate, message] = minLength(3, (min) => `Must be at least ${min} chars`)

  it('fails below minimum', () => {
    expect(predicate('ab')).toBe(false)
  })

  it('passes at minimum', () => {
    expect(predicate('abc')).toBe(true)
  })

  it('passes above minimum', () => {
    expect(predicate('abcd')).toBe(true)
  })

  it('produces the expected message', () => {
    expect(message).toBe('Must be at least 3 chars')
  })
})

describe('regex', () => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const [predicate, message] = regex(emailRegex, 'Invalid email')

  it('fails for non-matching string', () => {
    expect(predicate('not-an-email')).toBe(false)
  })

  it('passes for matching string', () => {
    expect(predicate('user@example.com')).toBe(true)
  })

  it('returns the provided message', () => {
    expect(message).toBe('Invalid email')
  })
})

describe('validateField', () => {
  const validations: ReadonlyArray<Validation<string>> = [
    required('Name'),
    minLength(2, (min) => `At least ${min} chars`),
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
