import { Array, Data, Effect, Match, Predicate, Ref, String, flow, pipe } from 'effect'
import { h } from 'snabbdom'
import type { VNodeData } from 'snabbdom'

import { Dispatch } from './runtime'
import { VNode } from './vdom'

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
  Href: { readonly value: string }
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
  Href: Href_,
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
export const Href = (value: string) => Href_({ value })
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
          Href: ({ value }) =>
            Ref.update(dataRef, (data) => ({
              ...data,
              props: { ...data.props, href: value },
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
