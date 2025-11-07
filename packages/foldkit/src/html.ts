import { Array, Data, Effect, Match, Predicate, Record, Ref, String, flow, pipe } from 'effect'
import { h } from 'snabbdom'
import type { Attrs, On, Props, VNodeData } from 'snabbdom'

import { Dispatch } from './runtime'
import { VNode } from './vdom'

export type Html = Effect.Effect<VNode | null, never, Dispatch>
export type Child = Html | string

export type TagName =
  | 'a'
  | 'abbr'
  | 'address'
  | 'area'
  | 'article'
  | 'aside'
  | 'audio'
  | 'b'
  | 'base'
  | 'bdi'
  | 'bdo'
  | 'blockquote'
  | 'body'
  | 'br'
  | 'button'
  | 'canvas'
  | 'caption'
  | 'cite'
  | 'code'
  | 'col'
  | 'colgroup'
  | 'data'
  | 'datalist'
  | 'dd'
  | 'del'
  | 'details'
  | 'dfn'
  | 'dialog'
  | 'div'
  | 'dl'
  | 'dt'
  | 'em'
  | 'embed'
  | 'fieldset'
  | 'figcaption'
  | 'figure'
  | 'footer'
  | 'form'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'h6'
  | 'head'
  | 'header'
  | 'hgroup'
  | 'hr'
  | 'html'
  | 'i'
  | 'iframe'
  | 'img'
  | 'input'
  | 'ins'
  | 'kbd'
  | 'label'
  | 'legend'
  | 'li'
  | 'link'
  | 'main'
  | 'map'
  | 'mark'
  | 'menu'
  | 'meta'
  | 'meter'
  | 'nav'
  | 'noscript'
  | 'object'
  | 'ol'
  | 'optgroup'
  | 'option'
  | 'output'
  | 'p'
  | 'picture'
  | 'portal'
  | 'pre'
  | 'progress'
  | 'q'
  | 'rp'
  | 'rt'
  | 'ruby'
  | 's'
  | 'samp'
  | 'script'
  | 'search'
  | 'section'
  | 'select'
  | 'slot'
  | 'small'
  | 'source'
  | 'span'
  | 'strong'
  | 'style'
  | 'sub'
  | 'summary'
  | 'sup'
  | 'table'
  | 'tbody'
  | 'td'
  | 'template'
  | 'textarea'
  | 'tfoot'
  | 'th'
  | 'thead'
  | 'time'
  | 'title'
  | 'tr'
  | 'track'
  | 'u'
  | 'ul'
  | 'var'
  | 'video'
  | 'wbr'
  | 'animate'
  | 'animateMotion'
  | 'animateTransform'
  | 'circle'
  | 'clipPath'
  | 'defs'
  | 'desc'
  | 'ellipse'
  | 'feBlend'
  | 'feColorMatrix'
  | 'feComponentTransfer'
  | 'feComposite'
  | 'feConvolveMatrix'
  | 'feDiffuseLighting'
  | 'feDisplacementMap'
  | 'feDistantLight'
  | 'feDropShadow'
  | 'feFlood'
  | 'feFuncA'
  | 'feFuncB'
  | 'feFuncG'
  | 'feFuncR'
  | 'feGaussianBlur'
  | 'feImage'
  | 'feMerge'
  | 'feMergeNode'
  | 'feMorphology'
  | 'feOffset'
  | 'fePointLight'
  | 'feSpecularLighting'
  | 'feSpotLight'
  | 'feTile'
  | 'feTurbulence'
  | 'filter'
  | 'foreignObject'
  | 'g'
  | 'image'
  | 'line'
  | 'linearGradient'
  | 'marker'
  | 'mask'
  | 'metadata'
  | 'mpath'
  | 'path'
  | 'pattern'
  | 'polygon'
  | 'polyline'
  | 'radialGradient'
  | 'rect'
  | 'stop'
  | 'svg'
  | 'switch'
  | 'symbol'
  | 'text'
  | 'textPath'
  | 'tspan'
  | 'use'
  | 'view'
  | 'annotation'
  | 'annotation-xml'
  | 'math'
  | 'maction'
  | 'menclose'
  | 'merror'
  | 'mfenced'
  | 'mfrac'
  | 'mglyph'
  | 'mi'
  | 'mlabeledtr'
  | 'mlongdiv'
  | 'mmultiscripts'
  | 'mn'
  | 'mo'
  | 'mover'
  | 'mpadded'
  | 'mphantom'
  | 'mroot'
  | 'mrow'
  | 'ms'
  | 'mscarries'
  | 'mscarry'
  | 'msgroup'
  | 'msline'
  | 'mspace'
  | 'msqrt'
  | 'msrow'
  | 'mstack'
  | 'mstyle'
  | 'msub'
  | 'msubsup'
  | 'msup'
  | 'mtable'
  | 'mtd'
  | 'mtext'
  | 'mtr'
  | 'munder'
  | 'munderover'
  | 'semantics'

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
  Spellcheck: { readonly value: boolean }
  Autocorrect: { readonly value: string }
  Autocapitalize: { readonly value: string }
  InputMode: { readonly value: string }
  EnterKeyHint: { readonly value: string }
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
  Attribute: { readonly key: string; readonly value: string }
  DataAttribute: { readonly key: string; readonly value: string }
  Style: { readonly value: Record<string, string> }
  InnerHTML: { readonly value: string }
  ViewBox: { readonly value: string }
  Xmlns: { readonly value: string }
  Fill: { readonly value: string }
  FillRule: { readonly value: string }
  ClipRule: { readonly value: string }
  Stroke: { readonly value: string }
  StrokeWidth: { readonly value: string }
  StrokeLinecap: { readonly value: string }
  StrokeLinejoin: { readonly value: string }
  D: { readonly value: string }
  Cx: { readonly value: string }
  Cy: { readonly value: string }
  R: { readonly value: string }
  X: { readonly value: string }
  Y: { readonly value: string }
  Width: { readonly value: string }
  Height: { readonly value: string }
  X1: { readonly value: string }
  Y1: { readonly value: string }
  X2: { readonly value: string }
  Y2: { readonly value: string }
  Points: { readonly value: string }
  Transform: { readonly value: string }
  Opacity: { readonly value: string }
  StrokeDasharray: { readonly value: string }
  StrokeDashoffset: { readonly value: string }
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
  Spellcheck: Spellcheck_,
  Autocorrect: Autocorrect_,
  Autocapitalize: Autocapitalize_,
  InputMode: InputMode_,
  EnterKeyHint: EnterKeyHint_,
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
  Attribute: Attribute_,
  DataAttribute: DataAttribute_,
  Style: Style_,
  InnerHTML: InnerHTML_,
  ViewBox: ViewBox_,
  Xmlns: Xmlns_,
  Fill: Fill_,
  FillRule: FillRule_,
  ClipRule: ClipRule_,
  Stroke: Stroke_,
  StrokeWidth: StrokeWidth_,
  StrokeLinecap: StrokeLinecap_,
  StrokeLinejoin: StrokeLinejoin_,
  D: D_,
  Cx: Cx_,
  Cy: Cy_,
  R: R_,
  X: X_,
  Y: Y_,
  Width: Width_,
  Height: Height_,
  X1: X1_,
  Y1: Y1_,
  X2: X2_,
  Y2: Y2_,
  Points: Points_,
  Transform: Transform_,
  Opacity: Opacity_,
  StrokeDasharray: StrokeDasharray_,
  StrokeDashoffset: StrokeDashoffset_,
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
export const Spellcheck = (value: boolean) => Spellcheck_({ value })
export const Autocorrect = (value: string) => Autocorrect_({ value })
export const Autocapitalize = (value: string) => Autocapitalize_({ value })
export const InputMode = (value: string) => InputMode_({ value })
export const EnterKeyHint = (value: string) => EnterKeyHint_({ value })
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
export const Attribute = (key: string, value: string) => Attribute_({ key, value })
export const DataAttr = (key: string, value: string) => DataAttribute_({ key, value })
export const StyleAttr = (value: Record<string, string>) => Style_({ value })
export const InnerHTML = (value: string) => InnerHTML_({ value })
export const ViewBox = (value: string) => ViewBox_({ value })
export const Xmlns = (value: string) => Xmlns_({ value })
export const Fill = (value: string) => Fill_({ value })
export const FillRule = (value: string) => FillRule_({ value })
export const ClipRule = (value: string) => ClipRule_({ value })
export const Stroke = (value: string) => Stroke_({ value })
export const StrokeWidth = (value: string) => StrokeWidth_({ value })
export const StrokeLinecap = (value: string) => StrokeLinecap_({ value })
export const StrokeLinejoin = (value: string) => StrokeLinejoin_({ value })
export const D = (value: string) => D_({ value })
export const Cx = (value: string) => Cx_({ value })
export const Cy = (value: string) => Cy_({ value })
export const R = (value: string) => R_({ value })
export const X = (value: string) => X_({ value })
export const Y = (value: string) => Y_({ value })
export const Width = (value: string) => Width_({ value })
export const Height = (value: string) => Height_({ value })
export const X1 = (value: string) => X1_({ value })
export const Y1 = (value: string) => Y1_({ value })
export const X2 = (value: string) => X2_({ value })
export const Y2 = (value: string) => Y2_({ value })
export const Points = (value: string) => Points_({ value })
export const Transform = (value: string) => Transform_({ value })
export const Opacity = (value: string) => Opacity_({ value })
export const StrokeDasharray = (value: string) => StrokeDasharray_({ value })
export const StrokeDashoffset = (value: string) => StrokeDashoffset_({ value })

const buildVNodeData = <Message>(
  attributes: ReadonlyArray<Attribute<Message>>,
): Effect.Effect<VNodeData, never, Dispatch> =>
  Effect.gen(function* () {
    const { dispatchSync } = yield* Dispatch
    const dataRef = yield* Ref.make<VNodeData>({})

    const setData = <K extends keyof VNodeData>(key: K, value: VNodeData[K]) =>
      Ref.update(dataRef, (data) => ({ ...data, [key]: value }))

    const updateData = <K extends keyof VNodeData>(key: K, value: Partial<VNodeData[K]>) =>
      Ref.update(dataRef, (data) => ({
        ...data,
        [key]: { ...data[key], ...value },
      }))

    const updateDataProps = (props: Props) => updateData('props', props)
    const updateDataOn = (on: On) => updateData('on', on)
    const updateDataAttrs = (attrs: Attrs) => updateData('attrs', attrs)

    const updatePropsWithPostpatch = <K extends string>(propName: K, value: unknown) =>
      Ref.update(dataRef, (data) => ({
        ...data,
        props: {
          ...data.props,
          [propName]: value,
        },
        hook: {
          ...data.hook,
          postpatch: (_oldVnode, vnode) => {
            if (vnode.elm) {
              /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
              ;(vnode.elm as any)[propName] = value
            }
          },
        },
      }))

    yield* Effect.forEach(attributes, (attr) =>
      Match.value(attr).pipe(
        Match.tagsExhaustive({
          Key: ({ value }) => setData('key', value),
          Class: ({ value }) =>
            Effect.gen(function* () {
              const classObject = pipe(
                value,
                String.split(' '),
                Array.filter(flow(String.trim, String.isNonEmpty)),
                Array.reduce({}, (acc, className) => ({ ...acc, [className]: true })),
              )
              yield* setData('class', classObject)
            }),
          Id: ({ value }) => updateDataProps({ id: value }),
          Title: ({ value }) => updateDataProps({ title: value }),
          Lang: ({ value }) => updateDataProps({ lang: value }),
          Dir: ({ value }) => updateDataProps({ dir: value }),
          Tabindex: ({ value }) => updateDataProps({ tabIndex: value }),
          Hidden: ({ value }) => updateDataProps({ hidden: value }),
          OnClick: ({ message }) =>
            updateDataOn({
              click: () => dispatchSync(message),
            }),
          OnDblClick: ({ message }) =>
            updateDataOn({
              dblclick: () => dispatchSync(message),
            }),
          OnMouseDown: ({ message }) =>
            updateDataOn({
              mousedown: () => dispatchSync(message),
            }),
          OnMouseUp: ({ message }) =>
            updateDataOn({
              mouseup: () => dispatchSync(message),
            }),
          OnMouseEnter: ({ message }) =>
            updateDataOn({
              mouseenter: () => dispatchSync(message),
            }),
          OnMouseLeave: ({ message }) =>
            updateDataOn({
              mouseleave: () => dispatchSync(message),
            }),
          OnMouseOver: ({ message }) =>
            updateDataOn({
              mouseover: () => dispatchSync(message),
            }),
          OnMouseOut: ({ message }) =>
            updateDataOn({
              mouseout: () => dispatchSync(message),
            }),
          OnMouseMove: ({ message }) =>
            updateDataOn({
              mousemove: () => dispatchSync(message),
            }),
          OnKeyDown: ({ f }) =>
            updateDataOn({
              keydown: ({ key }: KeyboardEvent) => dispatchSync(f(key)),
            }),
          OnKeyUp: ({ f }) =>
            updateDataOn({
              keyup: ({ key }: KeyboardEvent) => dispatchSync(f(key)),
            }),
          OnKeyPress: ({ f }) =>
            updateDataOn({
              keypress: ({ key }: KeyboardEvent) => dispatchSync(f(key)),
            }),
          OnFocus: ({ message }) =>
            updateDataOn({
              focus: () => dispatchSync(message),
            }),
          OnBlur: ({ message }) =>
            updateDataOn({
              blur: () => dispatchSync(message),
            }),
          OnInput: ({ f }) =>
            updateDataOn({
              input: (event: Event) =>
                /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
                dispatchSync(f((event.target as HTMLInputElement).value)),
            }),
          OnChange: ({ f }) =>
            updateDataOn({
              change: (event: Event) =>
                /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
                dispatchSync(f((event.target as HTMLInputElement).value)),
            }),
          OnSubmit: ({ message }) =>
            updateDataOn({
              submit: (event: Event) => {
                event.preventDefault()
                dispatchSync(message)
              },
            }),
          OnReset: ({ message }) =>
            updateDataOn({
              reset: () => dispatchSync(message),
            }),
          OnScroll: ({ message }) =>
            updateDataOn({
              scroll: () => dispatchSync(message),
            }),
          OnWheel: ({ message }) =>
            updateDataOn({
              wheel: () => dispatchSync(message),
            }),
          OnCopy: ({ message }) =>
            updateDataOn({
              copy: () => dispatchSync(message),
            }),
          OnCut: ({ message }) =>
            updateDataOn({
              cut: () => dispatchSync(message),
            }),
          OnPaste: ({ message }) =>
            updateDataOn({
              paste: () => dispatchSync(message),
            }),
          Value: ({ value }) => updatePropsWithPostpatch('value', value),
          Checked: ({ value }) => updatePropsWithPostpatch('checked', value),
          Selected: ({ value }) => updatePropsWithPostpatch('selected', value),
          Placeholder: ({ value }) => updateDataProps({ placeholder: value }),
          Name: ({ value }) => updateDataProps({ name: value }),
          Disabled: ({ value }) => updateDataProps({ disabled: value }),
          Readonly: ({ value }) => updateDataProps({ readOnly: value }),
          Required: ({ value }) => updateDataProps({ required: value }),
          Autofocus: ({ value }) => updateDataProps({ autofocus: value }),
          Spellcheck: ({ value }) => updateDataAttrs({ spellcheck: value.toString() }),
          Autocorrect: ({ value }) => updateDataAttrs({ autocorrect: value }),
          Autocapitalize: ({ value }) => updateDataAttrs({ autocapitalize: value }),
          InputMode: ({ value }) => updateDataAttrs({ inputmode: value }),
          EnterKeyHint: ({ value }) => updateDataAttrs({ enterkeyhint: value }),
          Multiple: ({ value }) => updateDataProps({ multiple: value }),
          Type: ({ value }) => updateDataProps({ type: value }),
          Accept: ({ value }) => updateDataProps({ accept: value }),
          Autocomplete: ({ value }) => updateDataProps({ autocomplete: value }),
          Pattern: ({ value }) => updateDataProps({ pattern: value }),
          Maxlength: ({ value }) => updateDataProps({ maxLength: value }),
          Minlength: ({ value }) => updateDataProps({ minLength: value }),
          Size: ({ value }) => updateDataProps({ size: value }),
          Cols: ({ value }) => updateDataProps({ cols: value }),
          Rows: ({ value }) => updateDataProps({ rows: value }),
          Max: ({ value }) => updateDataProps({ max: value }),
          Min: ({ value }) => updateDataProps({ min: value }),
          Step: ({ value }) => updateDataProps({ step: value }),
          For: ({ value }) => updateDataProps({ for: value }),
          Href: ({ value }) => updateDataProps({ href: value }),
          Src: ({ value }) => updateDataProps({ src: value }),
          Alt: ({ value }) => updateDataProps({ alt: value }),
          Target: ({ value }) => updateDataProps({ target: value }),
          Rel: ({ value }) => updateDataProps({ rel: value }),
          Download: ({ value }) => updateDataProps({ download: value }),
          Action: ({ value }) => updateDataProps({ action: value }),
          Method: ({ value }) => updateDataProps({ method: value }),
          Enctype: ({ value }) => updateDataProps({ enctype: value }),
          Novalidate: ({ value }) => updateDataProps({ noValidate: value }),
          Role: ({ value }) => updateDataAttrs({ role: value }),
          AriaLabel: ({ value }) => updateDataAttrs({ 'aria-label': value }),
          AriaLabelledBy: ({ value }) => updateDataAttrs({ 'aria-labelledby': value }),
          AriaDescribedBy: ({ value }) => updateDataAttrs({ 'aria-describedby': value }),
          AriaHidden: ({ value }) => updateDataAttrs({ 'aria-hidden': value.toString() }),
          AriaExpanded: ({ value }) => updateDataAttrs({ 'aria-expanded': value.toString() }),
          AriaSelected: ({ value }) => updateDataAttrs({ 'aria-selected': value.toString() }),
          AriaChecked: ({ value }) => updateDataAttrs({ 'aria-checked': value.toString() }),
          AriaDisabled: ({ value }) => updateDataAttrs({ 'aria-disabled': value.toString() }),
          AriaRequired: ({ value }) => updateDataAttrs({ 'aria-required': value.toString() }),
          AriaInvalid: ({ value }) => updateDataAttrs({ 'aria-invalid': value.toString() }),
          AriaLive: ({ value }) => updateDataAttrs({ 'aria-live': value }),
          Attribute: ({ key, value }) => updateDataAttrs({ [key]: value }),
          DataAttribute: ({ key, value }) => updateDataAttrs({ [`data-${key}`]: value }),
          Style: ({ value }) => setData('style', value),
          InnerHTML: ({ value }) => updateDataProps({ innerHTML: value }),
          ViewBox: ({ value }) => updateDataAttrs({ viewBox: value }),
          Xmlns: ({ value }) => updateDataAttrs({ xmlns: value }),
          Fill: ({ value }) => updateDataAttrs({ fill: value }),
          FillRule: ({ value }) => updateDataAttrs({ 'fill-rule': value }),
          ClipRule: ({ value }) => updateDataAttrs({ 'clip-rule': value }),
          Stroke: ({ value }) => updateDataAttrs({ stroke: value }),
          StrokeWidth: ({ value }) => updateDataAttrs({ 'stroke-width': value }),
          StrokeLinecap: ({ value }) => updateDataAttrs({ 'stroke-linecap': value }),
          StrokeLinejoin: ({ value }) => updateDataAttrs({ 'stroke-linejoin': value }),
          D: ({ value }) => updateDataAttrs({ d: value }),
          Cx: ({ value }) => updateDataAttrs({ cx: value }),
          Cy: ({ value }) => updateDataAttrs({ cy: value }),
          R: ({ value }) => updateDataAttrs({ r: value }),
          X: ({ value }) => updateDataAttrs({ x: value }),
          Y: ({ value }) => updateDataAttrs({ y: value }),
          Width: ({ value }) => updateDataAttrs({ width: value }),
          Height: ({ value }) => updateDataAttrs({ height: value }),
          X1: ({ value }) => updateDataAttrs({ x1: value }),
          Y1: ({ value }) => updateDataAttrs({ y1: value }),
          X2: ({ value }) => updateDataAttrs({ x2: value }),
          Y2: ({ value }) => updateDataAttrs({ y2: value }),
          Points: ({ value }) => updateDataAttrs({ points: value }),
          Transform: ({ value }) => updateDataAttrs({ transform: value }),
          Opacity: ({ value }) => updateDataAttrs({ opacity: value }),
          StrokeDasharray: ({ value }) => updateDataAttrs({ 'stroke-dasharray': value }),
          StrokeDashoffset: ({ value }) => updateDataAttrs({ 'stroke-dashoffset': value }),
        }),
      ),
    )

    return yield* Ref.get(dataRef)
  })

const processVNodeChildren = (
  children: ReadonlyArray<Child>,
): Effect.Effect<ReadonlyArray<VNode | string>, never, Dispatch> =>
  Effect.forEach(
    children,
    (child): Effect.Effect<VNode | string | null, never, Dispatch> =>
      Predicate.isString(child) ? Effect.succeed(child) : child,
  ).pipe(Effect.map(Array.filter(Predicate.isNotNull)))

export const createElement = <Message>(
  tagName: TagName,
  attributes: ReadonlyArray<Attribute<Message>> = [],
  children: ReadonlyArray<Child> = [],
): Html =>
  Effect.gen(function* () {
    const vnodeData = yield* buildVNodeData(attributes)
    const vnodeChildren = yield* processVNodeChildren(children)

    return h(tagName, vnodeData, Array.fromIterable(vnodeChildren))
  })

const element =
  (tagName: TagName) =>
  <Message>(
    attributes: ReadonlyArray<Attribute<Message>> = [],
    children: ReadonlyArray<Child> = [],
  ): Html =>
    createElement(tagName, attributes, children)

const voidElement =
  (tagName: TagName) =>
  <Message>(attributes: ReadonlyArray<Attribute<Message>> = []): Html =>
    createElement(tagName, attributes, [])

type AttributeWithoutKey<Message> = Exclude<Attribute<Message>, { _tag: 'Key' }>

export const keyed =
  (tagName: TagName) =>
  <Message>(
    key: string,
    attributes: ReadonlyArray<AttributeWithoutKey<Message>> = [],
    children: ReadonlyArray<Child> = [],
  ): Html =>
    element(tagName)([...attributes, Key(key)], children)

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
