import { Effect, Match, Data, Predicate, String, pipe, Array, flow, Ref } from 'effect'
import { Dispatch } from './runtime'
import { VNode } from './vdom'
import { h } from 'snabbdom'
import type { VNodeData } from 'snabbdom'

export type Html = Effect.Effect<VNode | null, never, Dispatch>
export type Child = Html | string

export type Attribute<Message> = Data.TaggedEnum<{
  Class: { readonly value: string }
  Id: { readonly value: string }
  OnClick: { readonly message: Message }
  OnChange: { readonly f: (value: string) => Message }
  OnSubmit: { readonly message: Message }
  Value: { readonly value: string }
  Placeholder: { readonly value: string }
  Disabled: { readonly value: boolean }
  Type: { readonly value: string }
  Min: { readonly value: string }
  For: { readonly value: string }
}>

interface AttributeDefinition extends Data.TaggedEnum.WithGenerics<1> {
  readonly taggedEnum: Attribute<this['A']>
}

export const {
  Class: Class_,
  Id: Id_,
  OnClick: OnClick_,
  OnChange: OnChange_,
  OnSubmit: OnSubmit_,
  Value: Value_,
  Placeholder: Placeholder_,
  Disabled: Disabled_,
  Type: Type_,
  Min: Min_,
  For: For_,
} = Data.taggedEnum<AttributeDefinition>()

export const Class = (value: string) => Class_({ value })
export const OnClick = <Message>(message: Message) => OnClick_({ message })
export const Id = (value: string) => Id_({ value })
export const OnChange = <Message>(f: (value: string) => Message) => OnChange_({ f })
export const OnSubmit = <Message>(message: Message) => OnSubmit_({ message })
export const Value = (value: string) => Value_({ value })
export const Placeholder = (value: string) => Placeholder_({ value })
export const Type = (value: string) => Type_({ value })
export const Min = (value: string) => Min_({ value })
export const For = (value: string) => For_({ value })
export const Disabled = (value: boolean) => Disabled_({ value })

const buildVNodeData = <Message>(
  attributes: ReadonlyArray<Attribute<Message>>,
): Effect.Effect<VNodeData, never, Dispatch> =>
  Effect.gen(function* () {
    const { dispatch } = yield* Dispatch
    const dataRef = yield* Ref.make<VNodeData>({})

    yield* Effect.forEach(attributes, (attr) =>
      Match.value(attr).pipe(
        Match.tagsExhaustive({
          Class: ({ value }) =>
            Effect.gen(function* () {
              const classObject = pipe(
                value,
                String.split(' '),
                Array.filter(flow(String.trim, String.isNonEmpty)),
                Array.reduce({}, (acc, className) => ({ ...acc, [className]: true })),
              )
              yield* Ref.update(dataRef, (data) => ({ ...data, class: classObject }))
            }),
          Id: ({ value }) =>
            Ref.update(dataRef, (data) => ({
              ...data,
              props: { ...data.props, id: value },
            })),
          OnClick: ({ message }) =>
            Ref.update(dataRef, (data) => ({
              ...data,
              on: {
                ...data.on,
                click: () => Effect.runSync(dispatch(message)),
              },
            })),
          OnChange: ({ f }) =>
            Ref.update(dataRef, (data) => ({
              ...data,
              on: {
                ...data.on,
                input: (event: Event) => {
                  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
                  const target = event.target as HTMLInputElement
                  Effect.runSync(dispatch(f(target.value)))
                },
              },
            })),
          OnSubmit: ({ message }) =>
            Ref.update(dataRef, (data) => ({
              ...data,
              on: {
                ...data.on,
                submit: (event: Event) => {
                  event.preventDefault()
                  Effect.runSync(dispatch(message))
                },
              },
            })),
          Value: ({ value }) =>
            Ref.update(dataRef, (data) => ({
              ...data,
              props: { ...data.props, value },
            })),
          Placeholder: ({ value }) =>
            Ref.update(dataRef, (data) => ({
              ...data,
              props: { ...data.props, placeholder: value },
            })),
          Disabled: ({ value }) =>
            Ref.update(dataRef, (data) => ({
              ...data,
              props: { ...data.props, disabled: value },
            })),
          Type: ({ value }) =>
            Ref.update(dataRef, (data) => ({
              ...data,
              props: { ...data.props, type: value },
            })),
          Min: ({ value }) =>
            Ref.update(dataRef, (data) => ({
              ...data,
              props: { ...data.props, min: value },
            })),
          For: ({ value }) =>
            Ref.update(dataRef, (data) => ({
              ...data,
              props: { ...data.props, for: value },
            })),
        }),
      ),
    )

    return yield* Ref.get(dataRef)
  })

const processVNodeChildren = (
  children: ReadonlyArray<Child>,
): Effect.Effect<(VNode | string)[], never, Dispatch> =>
  Effect.forEach(
    children,
    (child): Effect.Effect<VNode | string | null, never, Dispatch> =>
      Predicate.isString(child) ? Effect.succeed(child) : child,
  ).pipe(Effect.map(Array.filter(Predicate.isNotNull)))

export const createElement = <Message>(
  tagName: string,
  attributes: ReadonlyArray<Attribute<Message>> = [],
  children: ReadonlyArray<Child> = [],
): Html =>
  Effect.gen(function* () {
    const vnodeData = yield* buildVNodeData(attributes)
    const vnodeChildren = yield* processVNodeChildren(children)

    return h(tagName, vnodeData, vnodeChildren)
  })

const element =
  (tagName: string) =>
  <Message>(
    attributes: ReadonlyArray<Attribute<Message>> = [],
    children: ReadonlyArray<Child> = [],
  ): Html =>
    createElement(tagName, attributes, children)

const voidElement =
  (tagName: string) =>
  <Message>(attributes: ReadonlyArray<Attribute<Message>> = []): Html =>
    createElement(tagName, attributes, [])

export const div = element('div')
export const span = element('span')
export const button = element('button')
export const h1 = element('h1')
export const h2 = element('h2')
export const h3 = element('h3')
export const h4 = element('h4')
export const h5 = element('h5')
export const h6 = element('h6')
export const p = element('p')
export const ul = element('ul')
export const ol = element('ol')
export const li = element('li')
export const a = element('a')
export const form = element('form')
export const label = element('label')
export const textarea = element('textarea')
export const select = element('select')
export const option = element('option')

export const input = voidElement('input')
export const img = voidElement('img')

export const empty: Html = Effect.succeed(null)
