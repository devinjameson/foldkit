import { Effect, Match, Data, Predicate } from 'effect'
import { Dispatch } from './runtime'

export type Html = Effect.Effect<HTMLElement, never, Dispatch>
export type Child = Html | string

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

export const createElement = <Message>(
  tagName: string,
  attributes: ReadonlyArray<Attribute<Message>> = [],
  children: ReadonlyArray<Child> = [],
): Html =>
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

export const div = <Message>(
  attributes: ReadonlyArray<Attribute<Message>> = [],
  children: ReadonlyArray<Child> = [],
): Html => createElement('div', attributes, children)

export const span = <Message>(
  attributes: ReadonlyArray<Attribute<Message>> = [],
  children: ReadonlyArray<Child> = [],
): Html => createElement('span', attributes, children)

export const button = <Message>(
  attributes: ReadonlyArray<Attribute<Message>> = [],
  children: ReadonlyArray<Child> = [],
): Html => createElement('button', attributes, children)

export const input = <Message>(attributes: ReadonlyArray<Attribute<Message>> = []): Html =>
  createElement('input', attributes, [])

export const h1 = <Message>(
  attributes: ReadonlyArray<Attribute<Message>> = [],
  children: ReadonlyArray<Child> = [],
): Html => createElement('h1', attributes, children)

export const h2 = <Message>(
  attributes: ReadonlyArray<Attribute<Message>> = [],
  children: ReadonlyArray<Child> = [],
): Html => createElement('h2', attributes, children)

export const h3 = <Message>(
  attributes: ReadonlyArray<Attribute<Message>> = [],
  children: ReadonlyArray<Child> = [],
): Html => createElement('h3', attributes, children)

export const h4 = <Message>(
  attributes: ReadonlyArray<Attribute<Message>> = [],
  children: ReadonlyArray<Child> = [],
): Html => createElement('h4', attributes, children)

export const h5 = <Message>(
  attributes: ReadonlyArray<Attribute<Message>> = [],
  children: ReadonlyArray<Child> = [],
): Html => createElement('h5', attributes, children)

export const h6 = <Message>(
  attributes: ReadonlyArray<Attribute<Message>> = [],
  children: ReadonlyArray<Child> = [],
): Html => createElement('h6', attributes, children)

export const p = <Message>(
  attributes: ReadonlyArray<Attribute<Message>> = [],
  children: ReadonlyArray<Child> = [],
): Html => createElement('p', attributes, children)

export const ul = <Message>(
  attributes: ReadonlyArray<Attribute<Message>> = [],
  children: ReadonlyArray<Child> = [],
): Html => createElement('ul', attributes, children)

export const ol = <Message>(
  attributes: ReadonlyArray<Attribute<Message>> = [],
  children: ReadonlyArray<Child> = [],
): Html => createElement('ol', attributes, children)

export const li = <Message>(
  attributes: ReadonlyArray<Attribute<Message>> = [],
  children: ReadonlyArray<Child> = [],
): Html => createElement('li', attributes, children)

export const a = <Message>(
  attributes: ReadonlyArray<Attribute<Message>> = [],
  children: ReadonlyArray<Child> = [],
): Html => createElement('a', attributes, children)

export const img = <Message>(attributes: ReadonlyArray<Attribute<Message>> = []): Html =>
  createElement('img', attributes, [])

export const form = <Message>(
  attributes: ReadonlyArray<Attribute<Message>> = [],
  children: ReadonlyArray<Child> = [],
): Html => createElement('form', attributes, children)

export const label = <Message>(
  attributes: ReadonlyArray<Attribute<Message>> = [],
  children: ReadonlyArray<Child> = [],
): Html => createElement('label', attributes, children)

export const textarea = <Message>(
  attributes: ReadonlyArray<Attribute<Message>> = [],
  children: ReadonlyArray<Child> = [],
): Html => createElement('textarea', attributes, children)

export const select = <Message>(
  attributes: ReadonlyArray<Attribute<Message>> = [],
  children: ReadonlyArray<Child> = [],
): Html => createElement('select', attributes, children)

export const option = <Message>(
  attributes: ReadonlyArray<Attribute<Message>> = [],
  children: ReadonlyArray<Child> = [],
): Html => createElement('option', attributes, children)

export const text = (content: string): string => content
