import { Array, Data, Effect, Match, Predicate, Record, Ref, String, flow, pipe } from 'effect'
import { h } from 'snabbdom'
import type { Attrs, On, Props, VNodeData } from 'snabbdom'

import { Dispatch } from './runtime'
import { VNode } from './vdom'

export type Html = Effect.Effect<VNode | null, never, Dispatch>
export type Child = Html | string

export type ElementFunction<Message> = (
  attributes?: ReadonlyArray<Attribute<Message>>,
  children?: ReadonlyArray<Child>,
) => Html

export type VoidElementFunction<Message> = (attributes?: ReadonlyArray<Attribute<Message>>) => Html

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
  | 'set'
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
  | 'mprescripts'
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

const createElement = <Message>(
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
  <Message>() =>
  (tagName: TagName) =>
  (attributes: ReadonlyArray<Attribute<Message>> = [], children: ReadonlyArray<Child> = []): Html =>
    createElement(tagName, attributes, children)

const voidElement =
  <Message>() =>
  (tagName: TagName) =>
  (attributes: ReadonlyArray<Attribute<Message>> = []): Html =>
    createElement(tagName, attributes, [])

type AttributeWithoutKey<Message> = Exclude<Attribute<Message>, { _tag: 'Key' }>

const keyed =
  <Message>() =>
  (tagName: TagName) =>
  (
    key: string,
    attributes: ReadonlyArray<AttributeWithoutKey<Message>> = [],
    children: ReadonlyArray<Child> = [],
  ): Html =>
    element<Message>()(tagName)([...attributes, Key_({ value: key })], children)

export type HtmlElements<Message> = Record<
  TagName,
  ElementFunction<Message> | VoidElementFunction<Message>
>

export const htmlElements = <Message>(): HtmlElements<Message> => {
  const el = element<Message>()
  const voidEl = voidElement<Message>()

  return {
    // HTML
    a: el('a'),
    abbr: el('abbr'),
    address: el('address'),
    area: voidEl('area'),
    article: el('article'),
    aside: el('aside'),
    audio: el('audio'),
    b: el('b'),
    base: voidEl('base'),
    bdi: el('bdi'),
    bdo: el('bdo'),
    blockquote: el('blockquote'),
    body: el('body'),
    br: voidEl('br'),
    button: el('button'),
    canvas: el('canvas'),
    caption: el('caption'),
    cite: el('cite'),
    code: el('code'),
    col: voidEl('col'),
    colgroup: el('colgroup'),
    data: el('data'),
    datalist: el('datalist'),
    dd: el('dd'),
    del: el('del'),
    details: el('details'),
    dfn: el('dfn'),
    dialog: el('dialog'),
    div: el('div'),
    dl: el('dl'),
    dt: el('dt'),
    em: el('em'),
    embed: voidEl('embed'),
    fieldset: el('fieldset'),
    figcaption: el('figcaption'),
    figure: el('figure'),
    footer: el('footer'),
    form: el('form'),
    h1: el('h1'),
    h2: el('h2'),
    h3: el('h3'),
    h4: el('h4'),
    h5: el('h5'),
    h6: el('h6'),
    head: el('head'),
    header: el('header'),
    hgroup: el('hgroup'),
    hr: voidEl('hr'),
    html: el('html'),
    i: el('i'),
    iframe: el('iframe'),
    img: voidEl('img'),
    input: voidEl('input'),
    ins: el('ins'),
    kbd: el('kbd'),
    label: el('label'),
    legend: el('legend'),
    li: el('li'),
    link: voidEl('link'),
    main: el('main'),
    map: el('map'),
    mark: el('mark'),
    menu: el('menu'),
    meta: voidEl('meta'),
    meter: el('meter'),
    nav: el('nav'),
    noscript: el('noscript'),
    object: el('object'),
    ol: el('ol'),
    optgroup: el('optgroup'),
    option: el('option'),
    output: el('output'),
    p: el('p'),
    picture: el('picture'),
    portal: el('portal'),
    pre: el('pre'),
    progress: el('progress'),
    q: el('q'),
    rp: el('rp'),
    rt: el('rt'),
    ruby: el('ruby'),
    s: el('s'),
    samp: el('samp'),
    script: el('script'),
    search: el('search'),
    section: el('section'),
    select: el('select'),
    slot: el('slot'),
    small: el('small'),
    source: voidEl('source'),
    span: el('span'),
    strong: el('strong'),
    style: el('style'),
    sub: el('sub'),
    summary: el('summary'),
    sup: el('sup'),
    table: el('table'),
    tbody: el('tbody'),
    td: el('td'),
    template: el('template'),
    textarea: el('textarea'),
    tfoot: el('tfoot'),
    th: el('th'),
    thead: el('thead'),
    time: el('time'),
    title: el('title'),
    tr: el('tr'),
    track: voidEl('track'),
    u: el('u'),
    ul: el('ul'),
    var: el('var'),
    video: el('video'),
    wbr: voidEl('wbr'),

    // SVG
    svg: el('svg'),
    animate: el('animate'),
    animateMotion: el('animateMotion'),
    animateTransform: el('animateTransform'),
    circle: el('circle'),
    clipPath: el('clipPath'),
    defs: el('defs'),
    desc: el('desc'),
    ellipse: el('ellipse'),
    feBlend: el('feBlend'),
    feColorMatrix: el('feColorMatrix'),
    feComponentTransfer: el('feComponentTransfer'),
    feComposite: el('feComposite'),
    feConvolveMatrix: el('feConvolveMatrix'),
    feDiffuseLighting: el('feDiffuseLighting'),
    feDisplacementMap: el('feDisplacementMap'),
    feDistantLight: el('feDistantLight'),
    feDropShadow: el('feDropShadow'),
    feFlood: el('feFlood'),
    feFuncA: el('feFuncA'),
    feFuncB: el('feFuncB'),
    feFuncG: el('feFuncG'),
    feFuncR: el('feFuncR'),
    feGaussianBlur: el('feGaussianBlur'),
    feImage: el('feImage'),
    feMerge: el('feMerge'),
    feMergeNode: el('feMergeNode'),
    feMorphology: el('feMorphology'),
    feOffset: el('feOffset'),
    fePointLight: el('fePointLight'),
    feSpecularLighting: el('feSpecularLighting'),
    feSpotLight: el('feSpotLight'),
    feTile: el('feTile'),
    feTurbulence: el('feTurbulence'),
    filter: el('filter'),
    foreignObject: el('foreignObject'),
    g: el('g'),
    image: el('image'),
    line: el('line'),
    linearGradient: el('linearGradient'),
    marker: el('marker'),
    mask: el('mask'),
    metadata: el('metadata'),
    mpath: el('mpath'),
    path: el('path'),
    pattern: el('pattern'),
    polygon: el('polygon'),
    polyline: el('polyline'),
    radialGradient: el('radialGradient'),
    rect: el('rect'),
    set: el('set'),
    stop: el('stop'),
    switch: el('switch'),
    symbol: el('symbol'),
    text: el('text'),
    textPath: el('textPath'),
    tspan: el('tspan'),
    use: el('use'),
    view: el('view'),

    // MATH ML
    math: el('math'),
    annotation: el('annotation'),
    'annotation-xml': el('annotation-xml'),
    maction: el('maction'),
    menclose: el('menclose'),
    merror: el('merror'),
    mfenced: el('mfenced'),
    mfrac: el('mfrac'),
    mglyph: el('mglyph'),
    mi: el('mi'),
    mlabeledtr: el('mlabeledtr'),
    mlongdiv: el('mlongdiv'),
    mmultiscripts: el('mmultiscripts'),
    mn: el('mn'),
    mo: el('mo'),
    mover: el('mover'),
    mpadded: el('mpadded'),
    mphantom: el('mphantom'),
    mprescripts: el('mprescripts'),
    mroot: el('mroot'),
    mrow: el('mrow'),
    ms: el('ms'),
    mscarries: el('mscarries'),
    mscarry: el('mscarry'),
    msgroup: el('msgroup'),
    msline: el('msline'),
    mspace: el('mspace'),
    msqrt: el('msqrt'),
    msrow: el('msrow'),
    mstack: el('mstack'),
    mstyle: el('mstyle'),
    msub: el('msub'),
    msubsup: el('msubsup'),
    msup: el('msup'),
    mtable: el('mtable'),
    mtd: el('mtd'),
    mtext: el('mtext'),
    mtr: el('mtr'),
    munder: el('munder'),
    munderover: el('munderover'),
    semantics: el('semantics'),
  }
}

export type HtmlAttributes<Message> = {
  Key: (value: string) => Attribute<Message>
  Class: (value: string) => Attribute<Message>
  Id: (value: string) => Attribute<Message>
  Title: (value: string) => Attribute<Message>
  Lang: (value: string) => Attribute<Message>
  Dir: (value: string) => Attribute<Message>
  Tabindex: (value: number) => Attribute<Message>
  Hidden: (value: boolean) => Attribute<Message>
  OnClick: (message: Message) => Attribute<Message>
  OnDblClick: (message: Message) => Attribute<Message>
  OnMouseDown: (message: Message) => Attribute<Message>
  OnMouseUp: (message: Message) => Attribute<Message>
  OnMouseEnter: (message: Message) => Attribute<Message>
  OnMouseLeave: (message: Message) => Attribute<Message>
  OnMouseOver: (message: Message) => Attribute<Message>
  OnMouseOut: (message: Message) => Attribute<Message>
  OnMouseMove: (message: Message) => Attribute<Message>
  OnKeyDown: (f: (key: string) => Message) => Attribute<Message>
  OnKeyUp: (f: (key: string) => Message) => Attribute<Message>
  OnKeyPress: (f: (key: string) => Message) => Attribute<Message>
  OnFocus: (message: Message) => Attribute<Message>
  OnBlur: (message: Message) => Attribute<Message>
  OnInput: (f: (value: string) => Message) => Attribute<Message>
  OnChange: (f: (value: string) => Message) => Attribute<Message>
  OnSubmit: (message: Message) => Attribute<Message>
  OnReset: (message: Message) => Attribute<Message>
  OnScroll: (message: Message) => Attribute<Message>
  OnWheel: (message: Message) => Attribute<Message>
  OnCopy: (message: Message) => Attribute<Message>
  OnCut: (message: Message) => Attribute<Message>
  OnPaste: (message: Message) => Attribute<Message>
  Value: (value: string) => Attribute<Message>
  Checked: (value: boolean) => Attribute<Message>
  Selected: (value: boolean) => Attribute<Message>
  Placeholder: (value: string) => Attribute<Message>
  Name: (value: string) => Attribute<Message>
  Disabled: (value: boolean) => Attribute<Message>
  Readonly: (value: boolean) => Attribute<Message>
  Required: (value: boolean) => Attribute<Message>
  Autofocus: (value: boolean) => Attribute<Message>
  Spellcheck: (value: boolean) => Attribute<Message>
  Autocorrect: (value: string) => Attribute<Message>
  Autocapitalize: (value: string) => Attribute<Message>
  InputMode: (value: string) => Attribute<Message>
  EnterKeyHint: (value: string) => Attribute<Message>
  Multiple: (value: boolean) => Attribute<Message>
  Type: (value: string) => Attribute<Message>
  Accept: (value: string) => Attribute<Message>
  Autocomplete: (value: string) => Attribute<Message>
  Pattern: (value: string) => Attribute<Message>
  Maxlength: (value: number) => Attribute<Message>
  Minlength: (value: number) => Attribute<Message>
  Size: (value: number) => Attribute<Message>
  Cols: (value: number) => Attribute<Message>
  Rows: (value: number) => Attribute<Message>
  Max: (value: string) => Attribute<Message>
  Min: (value: string) => Attribute<Message>
  Step: (value: string) => Attribute<Message>
  For: (value: string) => Attribute<Message>
  Href: (value: string) => Attribute<Message>
  Src: (value: string) => Attribute<Message>
  Alt: (value: string) => Attribute<Message>
  Target: (value: string) => Attribute<Message>
  Rel: (value: string) => Attribute<Message>
  Download: (value: string) => Attribute<Message>
  Action: (value: string) => Attribute<Message>
  Method: (value: string) => Attribute<Message>
  Enctype: (value: string) => Attribute<Message>
  Novalidate: (value: boolean) => Attribute<Message>
  Role: (value: string) => Attribute<Message>
  AriaLabel: (value: string) => Attribute<Message>
  AriaLabelledBy: (value: string) => Attribute<Message>
  AriaDescribedBy: (value: string) => Attribute<Message>
  AriaHidden: (value: boolean) => Attribute<Message>
  AriaExpanded: (value: boolean) => Attribute<Message>
  AriaSelected: (value: boolean) => Attribute<Message>
  AriaChecked: (value: boolean) => Attribute<Message>
  AriaDisabled: (value: boolean) => Attribute<Message>
  AriaRequired: (value: boolean) => Attribute<Message>
  AriaInvalid: (value: boolean) => Attribute<Message>
  AriaLive: (value: string) => Attribute<Message>
  Attribute: (key: string, value: string) => Attribute<Message>
  DataAttribute: (key: string, value: string) => Attribute<Message>
  Style: (value: Record<string, string>) => Attribute<Message>
  InnerHTML: (value: string) => Attribute<Message>
  ViewBox: (value: string) => Attribute<Message>
  Xmlns: (value: string) => Attribute<Message>
  Fill: (value: string) => Attribute<Message>
  FillRule: (value: string) => Attribute<Message>
  ClipRule: (value: string) => Attribute<Message>
  Stroke: (value: string) => Attribute<Message>
  StrokeWidth: (value: string) => Attribute<Message>
  StrokeLinecap: (value: string) => Attribute<Message>
  StrokeLinejoin: (value: string) => Attribute<Message>
  D: (value: string) => Attribute<Message>
}

export const htmlAttributes = <Message>(): HtmlAttributes<Message> => {
  return {
    Key: (value: string) => Key_({ value }),
    Class: (value: string) => Class_({ value }),
    Id: (value: string) => Id_({ value }),
    Title: (value: string) => Title_({ value }),
    Lang: (value: string) => Lang_({ value }),
    Dir: (value: string) => Dir_({ value }),
    Tabindex: (value: number) => Tabindex_({ value }),
    Hidden: (value: boolean) => Hidden_({ value }),
    OnClick: (message: Message) => OnClick_({ message }),
    OnDblClick: (message: Message) => OnDblClick_({ message }),
    OnMouseDown: (message: Message) => OnMouseDown_({ message }),
    OnMouseUp: (message: Message) => OnMouseUp_({ message }),
    OnMouseEnter: (message: Message) => OnMouseEnter_({ message }),
    OnMouseLeave: (message: Message) => OnMouseLeave_({ message }),
    OnMouseOver: (message: Message) => OnMouseOver_({ message }),
    OnMouseOut: (message: Message) => OnMouseOut_({ message }),
    OnMouseMove: (message: Message) => OnMouseMove_({ message }),
    OnKeyDown: (f: (key: string) => Message) => OnKeyDown_({ f }),
    OnKeyUp: (f: (key: string) => Message) => OnKeyUp_({ f }),
    OnKeyPress: (f: (key: string) => Message) => OnKeyPress_({ f }),
    OnFocus: (message: Message) => OnFocus_({ message }),
    OnBlur: (message: Message) => OnBlur_({ message }),
    OnInput: (f: (value: string) => Message) => OnInput_({ f }),
    OnChange: (f: (value: string) => Message) => OnChange_({ f }),
    OnSubmit: (message: Message) => OnSubmit_({ message }),
    OnReset: (message: Message) => OnReset_({ message }),
    OnScroll: (message: Message) => OnScroll_({ message }),
    OnWheel: (message: Message) => OnWheel_({ message }),
    OnCopy: (message: Message) => OnCopy_({ message }),
    OnCut: (message: Message) => OnCut_({ message }),
    OnPaste: (message: Message) => OnPaste_({ message }),
    Value: (value: string) => Value_({ value }),
    Checked: (value: boolean) => Checked_({ value }),
    Selected: (value: boolean) => Selected_({ value }),
    Placeholder: (value: string) => Placeholder_({ value }),
    Name: (value: string) => Name_({ value }),
    Disabled: (value: boolean) => Disabled_({ value }),
    Readonly: (value: boolean) => Readonly_({ value }),
    Required: (value: boolean) => Required_({ value }),
    Autofocus: (value: boolean) => Autofocus_({ value }),
    Spellcheck: (value: boolean) => Spellcheck_({ value }),
    Autocorrect: (value: string) => Autocorrect_({ value }),
    Autocapitalize: (value: string) => Autocapitalize_({ value }),
    InputMode: (value: string) => InputMode_({ value }),
    EnterKeyHint: (value: string) => EnterKeyHint_({ value }),
    Multiple: (value: boolean) => Multiple_({ value }),
    Type: (value: string) => Type_({ value }),
    Accept: (value: string) => Accept_({ value }),
    Autocomplete: (value: string) => Autocomplete_({ value }),
    Pattern: (value: string) => Pattern_({ value }),
    Maxlength: (value: number) => Maxlength_({ value }),
    Minlength: (value: number) => Minlength_({ value }),
    Size: (value: number) => Size_({ value }),
    Cols: (value: number) => Cols_({ value }),
    Rows: (value: number) => Rows_({ value }),
    Max: (value: string) => Max_({ value }),
    Min: (value: string) => Min_({ value }),
    Step: (value: string) => Step_({ value }),
    For: (value: string) => For_({ value }),
    Href: (value: string) => Href_({ value }),
    Src: (value: string) => Src_({ value }),
    Alt: (value: string) => Alt_({ value }),
    Target: (value: string) => Target_({ value }),
    Rel: (value: string) => Rel_({ value }),
    Download: (value: string) => Download_({ value }),
    Action: (value: string) => Action_({ value }),
    Method: (value: string) => Method_({ value }),
    Enctype: (value: string) => Enctype_({ value }),
    Novalidate: (value: boolean) => Novalidate_({ value }),
    Role: (value: string) => Role_({ value }),
    AriaLabel: (value: string) => AriaLabel_({ value }),
    AriaLabelledBy: (value: string) => AriaLabelledBy_({ value }),
    AriaDescribedBy: (value: string) => AriaDescribedBy_({ value }),
    AriaHidden: (value: boolean) => AriaHidden_({ value }),
    AriaExpanded: (value: boolean) => AriaExpanded_({ value }),
    AriaSelected: (value: boolean) => AriaSelected_({ value }),
    AriaChecked: (value: boolean) => AriaChecked_({ value }),
    AriaDisabled: (value: boolean) => AriaDisabled_({ value }),
    AriaRequired: (value: boolean) => AriaRequired_({ value }),
    AriaInvalid: (value: boolean) => AriaInvalid_({ value }),
    AriaLive: (value: string) => AriaLive_({ value }),
    Attribute: (key: string, value: string) => Attribute_({ key, value }),
    DataAttribute: (key: string, value: string) => DataAttribute_({ key, value }),
    Style: (value: Record<string, string>) => Style_({ value }),
    InnerHTML: (value: string) => InnerHTML_({ value }),
    ViewBox: (value: string) => ViewBox_({ value }),
    Xmlns: (value: string) => Xmlns_({ value }),
    Fill: (value: string) => Fill_({ value }),
    FillRule: (value: string) => FillRule_({ value }),
    ClipRule: (value: string) => ClipRule_({ value }),
    Stroke: (value: string) => Stroke_({ value }),
    StrokeWidth: (value: string) => StrokeWidth_({ value }),
    StrokeLinecap: (value: string) => StrokeLinecap_({ value }),
    StrokeLinejoin: (value: string) => StrokeLinejoin_({ value }),
    D: (value: string) => D_({ value }),
  }
}

export const html = <Message>() => {
  return {
    ...htmlElements<Message>(),
    ...htmlAttributes<Message>(),
    empty: Effect.succeed(null),
    keyed: keyed<Message>(),
  }
}
