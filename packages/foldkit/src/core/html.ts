import { Effect, Match, Data, Predicate } from 'effect'
import { Dispatch } from './runtime'

export type Html<R = Dispatch> = Effect.Effect<HTMLElement, never, R>
export type Child<R> = Html<R> | string

export type Attribute<Message> = Data.TaggedEnum<{
  Class: { readonly value: string }
  Id: { readonly value: string }
  OnClick: { readonly message: Message }
  Value: { readonly value: string }
  Placeholder: { readonly value: string }
  Disabled: { readonly value: boolean }
}>

interface AttributeDefinition extends Data.TaggedEnum.WithGenerics<1> {
  readonly taggedEnum: Attribute<this['A']>
}

export const {
  Class: Class_,
  Id,
  OnClick: OnClick_,
  Value,
  Placeholder,
  Disabled,
} = Data.taggedEnum<AttributeDefinition>()

export const Class = (value: string) => Class_({ value })
export const OnClick = <Message>(message: Message) => OnClick_({ message })

export const applyAttributes = <Message>(
  element: HTMLElement,
  attributes: ReadonlyArray<Attribute<Message>>,
): Effect.Effect<void, never, Dispatch> =>
  Effect.gen(function* () {
    const { dispatch } = yield* Dispatch

    yield* Effect.forEach(attributes, (attr) =>
      Match.value(attr).pipe(
        Match.tagsExhaustive({
          Class: ({ value }) =>
            Effect.sync(() => {
              element.className = value
            }),
          Id: ({ value }) =>
            Effect.sync(() => {
              element.id = value
            }),
          OnClick: ({ message }) =>
            Effect.sync(() => {
              element.addEventListener('click', () => {
                Effect.runSync(dispatch(message))
              })
            }),
          Value: ({ value }) =>
            Effect.sync(() => {
              if (element instanceof HTMLInputElement) {
                element.value = value
              }
            }),
          Placeholder: ({ value }) =>
            Effect.sync(() => {
              if (element instanceof HTMLInputElement) {
                element.placeholder = value
              }
            }),
          Disabled: ({ value }) =>
            Effect.sync(() => {
              if (element instanceof HTMLInputElement || element instanceof HTMLButtonElement) {
                element.disabled = value
              }
            }),
        }),
      ),
    )
  })

type Requirements<R> = R | Dispatch

export const createElement = <Message, R>(
  tagName: string,
  attributes: ReadonlyArray<Attribute<Message>> = [],
  children: ReadonlyArray<Child<R>> = [],
): Html<Requirements<R>> =>
  Effect.gen(function* () {
    const element = document.createElement(tagName)

    yield* applyAttributes(element, attributes)

    yield* Effect.forEach(children, (child) =>
      Predicate.isString(child)
        ? Effect.sync(() => {
            element.appendChild(document.createTextNode(child))
          })
        : child.pipe(
            Effect.flatMap((node) =>
              Effect.sync(() => {
                element.appendChild(node)
              }),
            ),
          ),
    )
    return element
  })

export const div = <Message, R>(
  attributes: ReadonlyArray<Attribute<Message>> = [],
  children: ReadonlyArray<Child<R>> = [],
): Html<Requirements<R>> => createElement('div', attributes, children)

export const span = <Message, R>(
  attributes: ReadonlyArray<Attribute<Message>> = [],
  children: ReadonlyArray<Child<R>> = [],
): Html<Requirements<R>> => createElement('span', attributes, children)

export const button = <Message, R>(
  attributes: ReadonlyArray<Attribute<Message>> = [],
  children: ReadonlyArray<Child<R>> = [],
): Html<Requirements<R>> => createElement('button', attributes, children)

export const input = <Message, R>(
  attributes: ReadonlyArray<Attribute<Message>> = [],
): Html<Requirements<R>> => createElement('input', attributes, [])

export const h1 = <Message, R>(
  attributes: ReadonlyArray<Attribute<Message>> = [],
  children: ReadonlyArray<Child<R>> = [],
): Html<Requirements<R>> => createElement('h1', attributes, children)

export const h2 = <Message, R>(
  attributes: ReadonlyArray<Attribute<Message>> = [],
  children: ReadonlyArray<Child<R>> = [],
): Html<Requirements<R>> => createElement('h2', attributes, children)

export const h3 = <Message, R>(
  attributes: ReadonlyArray<Attribute<Message>> = [],
  children: ReadonlyArray<Child<R>> = [],
): Html<Requirements<R>> => createElement('h3', attributes, children)

export const h4 = <Message, R>(
  attributes: ReadonlyArray<Attribute<Message>> = [],
  children: ReadonlyArray<Child<R>> = [],
): Html<Requirements<R>> => createElement('h4', attributes, children)

export const h5 = <Message, R>(
  attributes: ReadonlyArray<Attribute<Message>> = [],
  children: ReadonlyArray<Child<R>> = [],
): Html<Requirements<R>> => createElement('h5', attributes, children)

export const h6 = <Message, R>(
  attributes: ReadonlyArray<Attribute<Message>> = [],
  children: ReadonlyArray<Child<R>> = [],
): Html<Requirements<R>> => createElement('h6', attributes, children)

export const p = <Message, R>(
  attributes: ReadonlyArray<Attribute<Message>> = [],
  children: ReadonlyArray<Child<R>> = [],
): Html<Requirements<R>> => createElement('p', attributes, children)

export const ul = <Message, R>(
  attributes: ReadonlyArray<Attribute<Message>> = [],
  children: ReadonlyArray<Child<R>> = [],
): Html<Requirements<R>> => createElement('ul', attributes, children)

export const ol = <Message, R>(
  attributes: ReadonlyArray<Attribute<Message>> = [],
  children: ReadonlyArray<Child<R>> = [],
): Html<Requirements<R>> => createElement('ol', attributes, children)

export const li = <Message, R>(
  attributes: ReadonlyArray<Attribute<Message>> = [],
  children: ReadonlyArray<Child<R>> = [],
): Html<Requirements<R>> => createElement('li', attributes, children)

export const a = <Message, R>(
  attributes: ReadonlyArray<Attribute<Message>> = [],
  children: ReadonlyArray<Child<R>> = [],
): Html<Requirements<R>> => createElement('a', attributes, children)

export const img = <Message, R>(
  attributes: ReadonlyArray<Attribute<Message>> = [],
): Html<Requirements<R>> => createElement('img', attributes, [])

export const form = <Message, R>(
  attributes: ReadonlyArray<Attribute<Message>> = [],
  children: ReadonlyArray<Child<R>> = [],
): Html<Requirements<R>> => createElement('form', attributes, children)

export const label = <Message, R>(
  attributes: ReadonlyArray<Attribute<Message>> = [],
  children: ReadonlyArray<Child<R>> = [],
): Html<Requirements<R>> => createElement('label', attributes, children)

export const textarea = <Message, R>(
  attributes: ReadonlyArray<Attribute<Message>> = [],
  children: ReadonlyArray<Child<R>> = [],
): Html<Requirements<R>> => createElement('textarea', attributes, children)

export const select = <Message, R>(
  attributes: ReadonlyArray<Attribute<Message>> = [],
  children: ReadonlyArray<Child<R>> = [],
): Html<Requirements<R>> => createElement('select', attributes, children)

export const option = <Message, R>(
  attributes: ReadonlyArray<Attribute<Message>> = [],
  children: ReadonlyArray<Child<R>> = [],
): Html<Requirements<R>> => createElement('option', attributes, children)

export const text = (content: string): string => content
