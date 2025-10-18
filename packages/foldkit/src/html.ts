import { Array, Data, Effect, Match, Predicate, Ref, String, flow, pipe } from 'effect'
import { h } from 'snabbdom'
import type { VNodeData } from 'snabbdom'

import { Dispatch } from './runtime'
import { VNode } from './vdom'

export type Html = Effect.Effect<VNode | null, never, Dispatch>
export type Child = Html | string

export type Attribute<Message> = Data.TaggedEnum<{
  Key: { readonly value: string }
  Class: { readonly value: string }
  Id: { readonly value: string }
  Title: { readonly value: string }
  Lang: { readonly value: string }
  Dir: { readonly value: string }
  Tabindex: { readonly value: number }
  Hidden: { readonly value: boolean }
  OnClick: { readonly message: Message }
  OnDblClick: { readonly message: Message }
  OnMouseDown: { readonly message: Message }
  OnMouseUp: { readonly message: Message }
  OnMouseEnter: { readonly message: Message }
  OnMouseLeave: { readonly message: Message }
  OnMouseOver: { readonly message: Message }
  OnMouseOut: { readonly message: Message }
  OnMouseMove: { readonly message: Message }
  OnKeyDown: { readonly f: (key: string) => Message }
  OnKeyUp: { readonly f: (key: string) => Message }
  OnKeyPress: { readonly f: (key: string) => Message }
  OnFocus: { readonly message: Message }
  OnBlur: { readonly message: Message }
  OnInput: { readonly f: (value: string) => Message }
  OnChange: { readonly f: (value: string) => Message }
  OnSubmit: { readonly message: Message }
  OnReset: { readonly message: Message }
  OnScroll: { readonly message: Message }
  OnWheel: { readonly message: Message }
  OnCopy: { readonly message: Message }
  OnCut: { readonly message: Message }
  OnPaste: { readonly message: Message }
  Value: { readonly value: string }
  Checked: { readonly value: boolean }
  Selected: { readonly value: boolean }
  Placeholder: { readonly value: string }
  Name: { readonly value: string }
  Disabled: { readonly value: boolean }
  Readonly: { readonly value: boolean }
  Required: { readonly value: boolean }
  Autofocus: { readonly value: boolean }
  Multiple: { readonly value: boolean }
  Type: { readonly value: string }
  Accept: { readonly value: string }
  Autocomplete: { readonly value: string }
  Pattern: { readonly value: string }
  Maxlength: { readonly value: number }
  Minlength: { readonly value: number }
  Size: { readonly value: number }
  Cols: { readonly value: number }
  Rows: { readonly value: number }
  Max: { readonly value: string }
  Min: { readonly value: string }
  Step: { readonly value: string }
  For: { readonly value: string }
  Href: { readonly value: string }
  Src: { readonly value: string }
  Alt: { readonly value: string }
  Target: { readonly value: string }
  Rel: { readonly value: string }
  Download: { readonly value: string }
  Action: { readonly value: string }
  Method: { readonly value: string }
  Enctype: { readonly value: string }
  Novalidate: { readonly value: boolean }
  Role: { readonly value: string }
  AriaLabel: { readonly value: string }
  AriaLabelledBy: { readonly value: string }
  AriaDescribedBy: { readonly value: string }
  AriaHidden: { readonly value: boolean }
  AriaExpanded: { readonly value: boolean }
  AriaSelected: { readonly value: boolean }
  AriaChecked: { readonly value: boolean }
  AriaDisabled: { readonly value: boolean }
  AriaRequired: { readonly value: boolean }
  AriaInvalid: { readonly value: boolean }
  AriaLive: { readonly value: string }
  DataAttribute: { readonly key: string; readonly value: string }
  Style: { readonly value: Record<string, string> }
}>

interface AttributeDefinition extends Data.TaggedEnum.WithGenerics<1> {
  readonly taggedEnum: Attribute<this['A']>
}

export const {
  Key: Key_,
  Class: Class_,
  Id: Id_,
  Title: Title_,
  Lang: Lang_,
  Dir: Dir_,
  Tabindex: Tabindex_,
  Hidden: Hidden_,
  OnClick: OnClick_,
  OnDblClick: OnDblClick_,
  OnMouseDown: OnMouseDown_,
  OnMouseUp: OnMouseUp_,
  OnMouseEnter: OnMouseEnter_,
  OnMouseLeave: OnMouseLeave_,
  OnMouseOver: OnMouseOver_,
  OnMouseOut: OnMouseOut_,
  OnMouseMove: OnMouseMove_,
  OnKeyDown: OnKeyDown_,
  OnKeyUp: OnKeyUp_,
  OnKeyPress: OnKeyPress_,
  OnFocus: OnFocus_,
  OnBlur: OnBlur_,
  OnInput: OnInput_,
  OnChange: OnChange_,
  OnSubmit: OnSubmit_,
  OnReset: OnReset_,
  OnScroll: OnScroll_,
  OnWheel: OnWheel_,
  OnCopy: OnCopy_,
  OnCut: OnCut_,
  OnPaste: OnPaste_,
  Value: Value_,
  Checked: Checked_,
  Selected: Selected_,
  Placeholder: Placeholder_,
  Name: Name_,
  Disabled: Disabled_,
  Readonly: Readonly_,
  Required: Required_,
  Autofocus: Autofocus_,
  Multiple: Multiple_,
  Type: Type_,
  Accept: Accept_,
  Autocomplete: Autocomplete_,
  Pattern: Pattern_,
  Maxlength: Maxlength_,
  Minlength: Minlength_,
  Size: Size_,
  Cols: Cols_,
  Rows: Rows_,
  Max: Max_,
  Min: Min_,
  Step: Step_,
  For: For_,
  Href: Href_,
  Src: Src_,
  Alt: Alt_,
  Target: Target_,
  Rel: Rel_,
  Download: Download_,
  Action: Action_,
  Method: Method_,
  Enctype: Enctype_,
  Novalidate: Novalidate_,
  Role: Role_,
  AriaLabel: AriaLabel_,
  AriaLabelledBy: AriaLabelledBy_,
  AriaDescribedBy: AriaDescribedBy_,
  AriaHidden: AriaHidden_,
  AriaExpanded: AriaExpanded_,
  AriaSelected: AriaSelected_,
  AriaChecked: AriaChecked_,
  AriaDisabled: AriaDisabled_,
  AriaRequired: AriaRequired_,
  AriaInvalid: AriaInvalid_,
  AriaLive: AriaLive_,
  DataAttribute: DataAttribute_,
  Style: Style_,
} = Data.taggedEnum<AttributeDefinition>()

export const Key = (value: string) => Key_({ value })
export const Class = (value: string) => Class_({ value })
export const Id = (value: string) => Id_({ value })
export const Title = (value: string) => Title_({ value })
export const Lang = (value: string) => Lang_({ value })
export const Dir = (value: string) => Dir_({ value })
export const Tabindex = (value: number) => Tabindex_({ value })
export const Hidden = (value: boolean) => Hidden_({ value })
export const OnClick = <Message>(message: Message) => OnClick_({ message })
export const OnDblClick = <Message>(message: Message) => OnDblClick_({ message })
export const OnMouseDown = <Message>(message: Message) => OnMouseDown_({ message })
export const OnMouseUp = <Message>(message: Message) => OnMouseUp_({ message })
export const OnMouseEnter = <Message>(message: Message) => OnMouseEnter_({ message })
export const OnMouseLeave = <Message>(message: Message) => OnMouseLeave_({ message })
export const OnMouseOver = <Message>(message: Message) => OnMouseOver_({ message })
export const OnMouseOut = <Message>(message: Message) => OnMouseOut_({ message })
export const OnMouseMove = <Message>(message: Message) => OnMouseMove_({ message })
export const OnKeyDown = <Message>(f: (key: string) => Message) => OnKeyDown_({ f })
export const OnKeyUp = <Message>(f: (key: string) => Message) => OnKeyUp_({ f })
export const OnKeyPress = <Message>(f: (key: string) => Message) => OnKeyPress_({ f })
export const OnFocus = <Message>(message: Message) => OnFocus_({ message })
export const OnBlur = <Message>(message: Message) => OnBlur_({ message })
export const OnInput = <Message>(f: (value: string) => Message) => OnInput_({ f })
export const OnChange = <Message>(f: (value: string) => Message) => OnChange_({ f })
export const OnSubmit = <Message>(message: Message) => OnSubmit_({ message })
export const OnReset = <Message>(message: Message) => OnReset_({ message })
export const OnScroll = <Message>(message: Message) => OnScroll_({ message })
export const OnWheel = <Message>(message: Message) => OnWheel_({ message })
export const OnCopy = <Message>(message: Message) => OnCopy_({ message })
export const OnCut = <Message>(message: Message) => OnCut_({ message })
export const OnPaste = <Message>(message: Message) => OnPaste_({ message })
export const Value = (value: string) => Value_({ value })
export const Checked = (value: boolean) => Checked_({ value })
export const Selected = (value: boolean) => Selected_({ value })
export const Placeholder = (value: string) => Placeholder_({ value })
export const Name = (value: string) => Name_({ value })
export const Disabled = (value: boolean) => Disabled_({ value })
export const Readonly = (value: boolean) => Readonly_({ value })
export const Required = (value: boolean) => Required_({ value })
export const Autofocus = (value: boolean) => Autofocus_({ value })
export const Multiple = (value: boolean) => Multiple_({ value })
export const Type = (value: string) => Type_({ value })
export const Accept = (value: string) => Accept_({ value })
export const Autocomplete = (value: string) => Autocomplete_({ value })
export const Pattern = (value: string) => Pattern_({ value })
export const Maxlength = (value: number) => Maxlength_({ value })
export const Minlength = (value: number) => Minlength_({ value })
export const Size = (value: number) => Size_({ value })
export const Cols = (value: number) => Cols_({ value })
export const Rows = (value: number) => Rows_({ value })
export const Max = (value: string) => Max_({ value })
export const Min = (value: string) => Min_({ value })
export const Step = (value: string) => Step_({ value })
export const For = (value: string) => For_({ value })
export const Href = (value: string) => Href_({ value })
export const Src = (value: string) => Src_({ value })
export const Alt = (value: string) => Alt_({ value })
export const Target = (value: string) => Target_({ value })
export const Rel = (value: string) => Rel_({ value })
export const Download = (value: string) => Download_({ value })
export const Action = (value: string) => Action_({ value })
export const Method = (value: string) => Method_({ value })
export const Enctype = (value: string) => Enctype_({ value })
export const Novalidate = (value: boolean) => Novalidate_({ value })
export const Role = (value: string) => Role_({ value })
export const AriaLabel = (value: string) => AriaLabel_({ value })
export const AriaLabelledBy = (value: string) => AriaLabelledBy_({ value })
export const AriaDescribedBy = (value: string) => AriaDescribedBy_({ value })
export const AriaHidden = (value: boolean) => AriaHidden_({ value })
export const AriaExpanded = (value: boolean) => AriaExpanded_({ value })
export const AriaSelected = (value: boolean) => AriaSelected_({ value })
export const AriaChecked = (value: boolean) => AriaChecked_({ value })
export const AriaDisabled = (value: boolean) => AriaDisabled_({ value })
export const AriaRequired = (value: boolean) => AriaRequired_({ value })
export const AriaInvalid = (value: boolean) => AriaInvalid_({ value })
export const AriaLive = (value: string) => AriaLive_({ value })
export const DataAttr = (key: string, value: string) => DataAttribute_({ key, value })
export const StyleAttr = (value: Record<string, string>) => Style_({ value })

const buildVNodeData = <Message>(
  attributes: ReadonlyArray<Attribute<Message>>,
): Effect.Effect<VNodeData, never, Dispatch> =>
  Effect.gen(function* () {
    const { dispatch } = yield* Dispatch
    const dataRef = yield* Ref.make<VNodeData>({})

    yield* Effect.forEach(attributes, (attr) =>
      Match.value(attr).pipe(
        Match.tagsExhaustive({
          Key: ({ value }) =>
            Ref.update(dataRef, (data) => ({
              ...data,
              key: value,
            })),
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
          Title: ({ value }) =>
            Ref.update(dataRef, (data) => ({
              ...data,
              props: { ...data.props, title: value },
            })),
          Lang: ({ value }) =>
            Ref.update(dataRef, (data) => ({
              ...data,
              props: { ...data.props, lang: value },
            })),
          Dir: ({ value }) =>
            Ref.update(dataRef, (data) => ({
              ...data,
              props: { ...data.props, dir: value },
            })),
          Tabindex: ({ value }) =>
            Ref.update(dataRef, (data) => ({
              ...data,
              props: { ...data.props, tabIndex: value },
            })),
          Hidden: ({ value }) =>
            Ref.update(dataRef, (data) => ({
              ...data,
              props: { ...data.props, hidden: value },
            })),
          OnClick: ({ message }) =>
            Ref.update(dataRef, (data) => ({
              ...data,
              on: {
                ...data.on,
                click: () => Effect.runSync(dispatch(message)),
              },
            })),
          OnDblClick: ({ message }) =>
            Ref.update(dataRef, (data) => ({
              ...data,
              on: {
                ...data.on,
                dblclick: () => Effect.runSync(dispatch(message)),
              },
            })),
          OnMouseDown: ({ message }) =>
            Ref.update(dataRef, (data) => ({
              ...data,
              on: {
                ...data.on,
                mousedown: () => Effect.runSync(dispatch(message)),
              },
            })),
          OnMouseUp: ({ message }) =>
            Ref.update(dataRef, (data) => ({
              ...data,
              on: {
                ...data.on,
                mouseup: () => Effect.runSync(dispatch(message)),
              },
            })),
          OnMouseEnter: ({ message }) =>
            Ref.update(dataRef, (data) => ({
              ...data,
              on: {
                ...data.on,
                mouseenter: () => Effect.runSync(dispatch(message)),
              },
            })),
          OnMouseLeave: ({ message }) =>
            Ref.update(dataRef, (data) => ({
              ...data,
              on: {
                ...data.on,
                mouseleave: () => Effect.runSync(dispatch(message)),
              },
            })),
          OnMouseOver: ({ message }) =>
            Ref.update(dataRef, (data) => ({
              ...data,
              on: {
                ...data.on,
                mouseover: () => Effect.runSync(dispatch(message)),
              },
            })),
          OnMouseOut: ({ message }) =>
            Ref.update(dataRef, (data) => ({
              ...data,
              on: {
                ...data.on,
                mouseout: () => Effect.runSync(dispatch(message)),
              },
            })),
          OnMouseMove: ({ message }) =>
            Ref.update(dataRef, (data) => ({
              ...data,
              on: {
                ...data.on,
                mousemove: () => Effect.runSync(dispatch(message)),
              },
            })),
          OnKeyDown: ({ f }) =>
            Ref.update(dataRef, (data) => ({
              ...data,
              on: {
                ...data.on,
                keydown: (event: Event) => {
                  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
                  const keyEvent = event as KeyboardEvent
                  Effect.runSync(dispatch(f(keyEvent.key)))
                },
              },
            })),
          OnKeyUp: ({ f }) =>
            Ref.update(dataRef, (data) => ({
              ...data,
              on: {
                ...data.on,
                keyup: (event: Event) => {
                  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
                  const keyEvent = event as KeyboardEvent
                  Effect.runSync(dispatch(f(keyEvent.key)))
                },
              },
            })),
          OnKeyPress: ({ f }) =>
            Ref.update(dataRef, (data) => ({
              ...data,
              on: {
                ...data.on,
                keypress: (event: Event) => {
                  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
                  const keyEvent = event as KeyboardEvent
                  Effect.runSync(dispatch(f(keyEvent.key)))
                },
              },
            })),
          OnFocus: ({ message }) =>
            Ref.update(dataRef, (data) => ({
              ...data,
              on: {
                ...data.on,
                focus: () => Effect.runSync(dispatch(message)),
              },
            })),
          OnBlur: ({ message }) =>
            Ref.update(dataRef, (data) => ({
              ...data,
              on: {
                ...data.on,
                blur: () => Effect.runSync(dispatch(message)),
              },
            })),
          OnInput: ({ f }) =>
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
          OnChange: ({ f }) =>
            Ref.update(dataRef, (data) => ({
              ...data,
              on: {
                ...data.on,
                change: (event: Event) => {
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
          OnReset: ({ message }) =>
            Ref.update(dataRef, (data) => ({
              ...data,
              on: {
                ...data.on,
                reset: () => Effect.runSync(dispatch(message)),
              },
            })),
          OnScroll: ({ message }) =>
            Ref.update(dataRef, (data) => ({
              ...data,
              on: {
                ...data.on,
                scroll: () => Effect.runSync(dispatch(message)),
              },
            })),
          OnWheel: ({ message }) =>
            Ref.update(dataRef, (data) => ({
              ...data,
              on: {
                ...data.on,
                wheel: () => Effect.runSync(dispatch(message)),
              },
            })),
          OnCopy: ({ message }) =>
            Ref.update(dataRef, (data) => ({
              ...data,
              on: {
                ...data.on,
                copy: () => Effect.runSync(dispatch(message)),
              },
            })),
          OnCut: ({ message }) =>
            Ref.update(dataRef, (data) => ({
              ...data,
              on: {
                ...data.on,
                cut: () => Effect.runSync(dispatch(message)),
              },
            })),
          OnPaste: ({ message }) =>
            Ref.update(dataRef, (data) => ({
              ...data,
              on: {
                ...data.on,
                paste: () => Effect.runSync(dispatch(message)),
              },
            })),
          Value: ({ value }) =>
            Ref.update(dataRef, (data) => ({
              ...data,
              props: { ...data.props, value },
            })),
          Checked: ({ value }) =>
            Ref.update(dataRef, (data) => ({
              ...data,
              props: { ...data.props, checked: value },
            })),
          Selected: ({ value }) =>
            Ref.update(dataRef, (data) => ({
              ...data,
              props: { ...data.props, selected: value },
            })),
          Placeholder: ({ value }) =>
            Ref.update(dataRef, (data) => ({
              ...data,
              props: { ...data.props, placeholder: value },
            })),
          Name: ({ value }) =>
            Ref.update(dataRef, (data) => ({
              ...data,
              props: { ...data.props, name: value },
            })),
          Disabled: ({ value }) =>
            Ref.update(dataRef, (data) => ({
              ...data,
              props: { ...data.props, disabled: value },
            })),
          Readonly: ({ value }) =>
            Ref.update(dataRef, (data) => ({
              ...data,
              props: { ...data.props, readOnly: value },
            })),
          Required: ({ value }) =>
            Ref.update(dataRef, (data) => ({
              ...data,
              props: { ...data.props, required: value },
            })),
          Autofocus: ({ value }) =>
            Ref.update(dataRef, (data) => ({
              ...data,
              props: { ...data.props, autofocus: value },
            })),
          Multiple: ({ value }) =>
            Ref.update(dataRef, (data) => ({
              ...data,
              props: { ...data.props, multiple: value },
            })),
          Type: ({ value }) =>
            Ref.update(dataRef, (data) => ({
              ...data,
              props: { ...data.props, type: value },
            })),
          Accept: ({ value }) =>
            Ref.update(dataRef, (data) => ({
              ...data,
              props: { ...data.props, accept: value },
            })),
          Autocomplete: ({ value }) =>
            Ref.update(dataRef, (data) => ({
              ...data,
              props: { ...data.props, autocomplete: value },
            })),
          Pattern: ({ value }) =>
            Ref.update(dataRef, (data) => ({
              ...data,
              props: { ...data.props, pattern: value },
            })),
          Maxlength: ({ value }) =>
            Ref.update(dataRef, (data) => ({
              ...data,
              props: { ...data.props, maxLength: value },
            })),
          Minlength: ({ value }) =>
            Ref.update(dataRef, (data) => ({
              ...data,
              props: { ...data.props, minLength: value },
            })),
          Size: ({ value }) =>
            Ref.update(dataRef, (data) => ({
              ...data,
              props: { ...data.props, size: value },
            })),
          Cols: ({ value }) =>
            Ref.update(dataRef, (data) => ({
              ...data,
              props: { ...data.props, cols: value },
            })),
          Rows: ({ value }) =>
            Ref.update(dataRef, (data) => ({
              ...data,
              props: { ...data.props, rows: value },
            })),
          Max: ({ value }) =>
            Ref.update(dataRef, (data) => ({
              ...data,
              props: { ...data.props, max: value },
            })),
          Min: ({ value }) =>
            Ref.update(dataRef, (data) => ({
              ...data,
              props: { ...data.props, min: value },
            })),
          Step: ({ value }) =>
            Ref.update(dataRef, (data) => ({
              ...data,
              props: { ...data.props, step: value },
            })),
          For: ({ value }) =>
            Ref.update(dataRef, (data) => ({
              ...data,
              props: { ...data.props, for: value },
            })),
          Href: ({ value }) =>
            Ref.update(dataRef, (data) => ({
              ...data,
              props: { ...data.props, href: value },
            })),
          Src: ({ value }) =>
            Ref.update(dataRef, (data) => ({
              ...data,
              props: { ...data.props, src: value },
            })),
          Alt: ({ value }) =>
            Ref.update(dataRef, (data) => ({
              ...data,
              props: { ...data.props, alt: value },
            })),
          Target: ({ value }) =>
            Ref.update(dataRef, (data) => ({
              ...data,
              props: { ...data.props, target: value },
            })),
          Rel: ({ value }) =>
            Ref.update(dataRef, (data) => ({
              ...data,
              props: { ...data.props, rel: value },
            })),
          Download: ({ value }) =>
            Ref.update(dataRef, (data) => ({
              ...data,
              props: { ...data.props, download: value },
            })),
          Action: ({ value }) =>
            Ref.update(dataRef, (data) => ({
              ...data,
              props: { ...data.props, action: value },
            })),
          Method: ({ value }) =>
            Ref.update(dataRef, (data) => ({
              ...data,
              props: { ...data.props, method: value },
            })),
          Enctype: ({ value }) =>
            Ref.update(dataRef, (data) => ({
              ...data,
              props: { ...data.props, enctype: value },
            })),
          Novalidate: ({ value }) =>
            Ref.update(dataRef, (data) => ({
              ...data,
              props: { ...data.props, noValidate: value },
            })),
          Role: ({ value }) =>
            Ref.update(dataRef, (data) => ({
              ...data,
              attrs: { ...data.attrs, role: value },
            })),
          AriaLabel: ({ value }) =>
            Ref.update(dataRef, (data) => ({
              ...data,
              attrs: { ...data.attrs, 'aria-label': value },
            })),
          AriaLabelledBy: ({ value }) =>
            Ref.update(dataRef, (data) => ({
              ...data,
              attrs: { ...data.attrs, 'aria-labelledby': value },
            })),
          AriaDescribedBy: ({ value }) =>
            Ref.update(dataRef, (data) => ({
              ...data,
              attrs: { ...data.attrs, 'aria-describedby': value },
            })),
          AriaHidden: ({ value }) =>
            Ref.update(dataRef, (data) => ({
              ...data,
              attrs: { ...data.attrs, 'aria-hidden': value.toString() },
            })),
          AriaExpanded: ({ value }) =>
            Ref.update(dataRef, (data) => ({
              ...data,
              attrs: { ...data.attrs, 'aria-expanded': value.toString() },
            })),
          AriaSelected: ({ value }) =>
            Ref.update(dataRef, (data) => ({
              ...data,
              attrs: { ...data.attrs, 'aria-selected': value.toString() },
            })),
          AriaChecked: ({ value }) =>
            Ref.update(dataRef, (data) => ({
              ...data,
              attrs: { ...data.attrs, 'aria-checked': value.toString() },
            })),
          AriaDisabled: ({ value }) =>
            Ref.update(dataRef, (data) => ({
              ...data,
              attrs: { ...data.attrs, 'aria-disabled': value.toString() },
            })),
          AriaRequired: ({ value }) =>
            Ref.update(dataRef, (data) => ({
              ...data,
              attrs: { ...data.attrs, 'aria-required': value.toString() },
            })),
          AriaInvalid: ({ value }) =>
            Ref.update(dataRef, (data) => ({
              ...data,
              attrs: { ...data.attrs, 'aria-invalid': value.toString() },
            })),
          AriaLive: ({ value }) =>
            Ref.update(dataRef, (data) => ({
              ...data,
              attrs: { ...data.attrs, 'aria-live': value },
            })),
          DataAttribute: ({ key, value }) =>
            Ref.update(dataRef, (data) => ({
              ...data,
              attrs: { ...data.attrs, [`data-${key}`]: value },
            })),
          Style: ({ value }) =>
            Ref.update(dataRef, (data) => ({
              ...data,
              style: value,
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

// HTML

export const a = element('a')
export const abbr = element('abbr')
export const address = element('address')
export const area = voidElement('area')
export const article = element('article')
export const aside = element('aside')
export const audio = element('audio')
export const b = element('b')
export const base = voidElement('base')
export const bdi = element('bdi')
export const bdo = element('bdo')
export const blockquote = element('blockquote')
export const body = element('body')
export const br = voidElement('br')
export const button = element('button')
export const canvas = element('canvas')
export const caption = element('caption')
export const cite = element('cite')
export const code = element('code')
export const col = voidElement('col')
export const colgroup = element('colgroup')
export const data = element('data')
export const datalist = element('datalist')
export const dd = element('dd')
export const del = element('del')
export const details = element('details')
export const dfn = element('dfn')
export const dialog = element('dialog')
export const div = element('div')
export const dl = element('dl')
export const dt = element('dt')
export const em = element('em')
export const embed = voidElement('embed')
export const fieldset = element('fieldset')
export const figcaption = element('figcaption')
export const figure = element('figure')
export const footer = element('footer')
export const form = element('form')
export const h1 = element('h1')
export const h2 = element('h2')
export const h3 = element('h3')
export const h4 = element('h4')
export const h5 = element('h5')
export const h6 = element('h6')
export const head = element('head')
export const header = element('header')
export const hgroup = element('hgroup')
export const hr = voidElement('hr')
export const html = element('html')
export const i = element('i')
export const iframe = element('iframe')
export const img = voidElement('img')
export const input = voidElement('input')
export const ins = element('ins')
export const kbd = element('kbd')
export const label = element('label')
export const legend = element('legend')
export const li = element('li')
export const link = voidElement('link')
export const main = element('main')
export const map = element('map')
export const mark = element('mark')
export const menu = element('menu')
export const meta = voidElement('meta')
export const meter = element('meter')
export const nav = element('nav')
export const noscript = element('noscript')
export const object = element('object')
export const ol = element('ol')
export const optgroup = element('optgroup')
export const option = element('option')
export const output = element('output')
export const p = element('p')
export const picture = element('picture')
export const portal = element('portal')
export const pre = element('pre')
export const progress = element('progress')
export const q = element('q')
export const rp = element('rp')
export const rt = element('rt')
export const ruby = element('ruby')
export const s = element('s')
export const samp = element('samp')
export const script = element('script')
export const search = element('search')
export const section = element('section')
export const select = element('select')
export const slot = element('slot')
export const small = element('small')
export const source = voidElement('source')
export const span = element('span')
export const strong = element('strong')
export const style = element('style')
export const sub = element('sub')
export const summary = element('summary')
export const sup = element('sup')
export const table = element('table')
export const tbody = element('tbody')
export const td = element('td')
export const template = element('template')
export const textarea = element('textarea')
export const tfoot = element('tfoot')
export const th = element('th')
export const thead = element('thead')
export const time = element('time')
export const title = element('title')
export const tr = element('tr')
export const track = voidElement('track')
export const u = element('u')
export const ul = element('ul')
export const var_ = element('var')
export const video = element('video')
export const wbr = voidElement('wbr')

// SVG

export const animate = element('animate')
export const animateMotion = element('animateMotion')
export const animateTransform = element('animateTransform')
export const circle = element('circle')
export const clipPath = element('clipPath')
export const defs = element('defs')
export const desc = element('desc')
export const ellipse = element('ellipse')
export const feBlend = element('feBlend')
export const feColorMatrix = element('feColorMatrix')
export const feComponentTransfer = element('feComponentTransfer')
export const feComposite = element('feComposite')
export const feConvolveMatrix = element('feConvolveMatrix')
export const feDiffuseLighting = element('feDiffuseLighting')
export const feDisplacementMap = element('feDisplacementMap')
export const feDistantLight = element('feDistantLight')
export const feDropShadow = element('feDropShadow')
export const feFlood = element('feFlood')
export const feFuncA = element('feFuncA')
export const feFuncB = element('feFuncB')
export const feFuncG = element('feFuncG')
export const feFuncR = element('feFuncR')
export const feGaussianBlur = element('feGaussianBlur')
export const feImage = element('feImage')
export const feMerge = element('feMerge')
export const feMergeNode = element('feMergeNode')
export const feMorphology = element('feMorphology')
export const feOffset = element('feOffset')
export const fePointLight = element('fePointLight')
export const feSpecularLighting = element('feSpecularLighting')
export const feSpotLight = element('feSpotLight')
export const feTile = element('feTile')
export const feTurbulence = element('feTurbulence')
export const filter = element('filter')
export const foreignObject = element('foreignObject')
export const g = element('g')
export const image = element('image')
export const line = element('line')
export const linearGradient = element('linearGradient')
export const marker = element('marker')
export const mask = element('mask')
export const metadata = element('metadata')
export const mpath = element('mpath')
export const path = element('path')
export const pattern = element('pattern')
export const polygon = element('polygon')
export const polyline = element('polyline')
export const radialGradient = element('radialGradient')
export const rect = element('rect')
export const stop = element('stop')
export const svg = element('svg')
export const switch_ = element('switch')
export const symbol = element('symbol')
export const text = element('text')
export const textPath = element('textPath')
export const tspan = element('tspan')
export const use = element('use')
export const view = element('view')

// MATH ML

export const annotation = element('annotation')
export const annotationXml = element('annotation-xml')
export const math = element('math')
export const maction = element('maction')
export const menclose = element('menclose')
export const merror = element('merror')
export const mfenced = element('mfenced')
export const mfrac = element('mfrac')
export const mglyph = element('mglyph')
export const mi = element('mi')
export const mlabeledtr = element('mlabeledtr')
export const mlongdiv = element('mlongdiv')
export const mmultiscripts = element('mmultiscripts')
export const mn = element('mn')
export const mo = element('mo')
export const mover = element('mover')
export const mpadded = element('mpadded')
export const mphantom = element('mphantom')
export const mroot = element('mroot')
export const mrow = element('mrow')
export const ms = element('ms')
export const mscarries = element('mscarries')
export const mscarry = element('mscarry')
export const msgroup = element('msgroup')
export const msline = element('msline')
export const mspace = element('mspace')
export const msqrt = element('msqrt')
export const msrow = element('msrow')
export const mstack = element('mstack')
export const mstyle = element('mstyle')
export const msub = element('msub')
export const msubsup = element('msubsup')
export const msup = element('msup')
export const mtable = element('mtable')
export const mtd = element('mtd')
export const mtext = element('mtext')
export const mtr = element('mtr')
export const munder = element('munder')
export const munderover = element('munderover')
export const semantics = element('semantics')

// EMPTY

export const empty: Html = Effect.succeed(null)
