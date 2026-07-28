# CustomElement

## Overview

Native web components are a standard browser feature: a hyphenated tag, a class extending `HTMLElement`, observed attributes, JS properties, and `CustomEvent`s. They can render into a shadow DOM and handle their own keyboard and pointer behavior. Foldkit gives them a typed seam through `CustomElement.define`, so they slot into a view next to standard elements without manual property wiring or a separate Mount step.

You declare the element’s shape once with Schema. Property factories arrive as PascalCase methods on the builder, event factories as `On{PascalCase}` methods. The builder is callable, so the element itself appears inline in your view alongside `h.div`, `h.button`, etc. Property changes diff across renders; CustomEvents come back as Messages.

:::Info{label="CustomElement.define mirrors Command.define and Mount.define"}
The shape is consistent across Foldkit’s lifecycle primitives. Declare the foreign element once. The runtime owns the wiring. Your view stays a pure function from Model to VNode.
:::

## Defining a Binding

Foldkit only owns the typed binding. Registering the element class with the browser is the same step you would take in any other framework. Most third-party packages do it for you when imported: `import 'vanilla-colorful/hex-color-picker.js'` calls `customElements.define('hex-color-picker', HexColorPicker)` as a side effect, and `<hex-color-picker>` is then a real tag in the browser. If you author your own element, you do the same: `customElements.define('your-tag', YourClass)` once, usually alongside the class definition.

A `CustomElement.define` call takes the tag name, a record of properties keyed by their JS property name, and a record of events keyed by their kebab-case event name. It returns a spec you can export and share across modules. Inside the view, call `.withMessage(h)` with the builder the view received. That binds the element to the Message universe of the frame it renders in, so an event handler on it carries a Message the frame's dispatcher can route.

::Snippet{name="customElementDefine" label="CustomElement.define example"}

The element constructor is callable. Pass attributes (including the property and event factories) as the first argument and children as the second, same shape as `h.div` and friends. Property factories are checked against the declared Schema at the type level: `qr.Size("220")` is a compile error when `size` is declared as `S.Number`. Event factories receive a typed `detail` argument; the consumer returns a Message that the runtime dispatches when the CustomEvent fires.

## Properties and Events

Each property in the config becomes a PascalCase factory: `value` → `Value`, `isDisabled` → `IsDisabled`. The factory writes a JS property on the live element through `propsModule`, not an HTML attribute. That distinction matters: properties can carry any JS value (arrays, dates, objects), and `propsModule` diffs them across renders so the element only receives writes when the value actually changes. Removed boolean properties get reset to `false` on cleanup.

Each event becomes an `On{PascalCase}` factory derived from the kebab-case name: `"color-changed"` → `OnColorChanged`. The factory takes a `(detail) => Message` callback. When the element dispatches the CustomEvent, the runtime extracts `event.detail`, runs your callback, and dispatches the resulting Message just like any other handler.

:::Info{label="Validation runs at define time"}
`CustomElement.define` validates property and event names up front. Property names must be valid JS identifiers; event names must be hyphen-separated lowercase segments. Collisions between factory names (e.g. a `click` event and an `onClick` property both producing `OnClick`) throw immediately so you catch them before they ship.
:::

## When to Reach for CustomElement

CustomElement is the right primitive when the foreign element has a declarative API: typed JS properties going in, `CustomEvent`s coming out. Everything you push to the element is a property; everything you read back is an event. The element owns its rendering and its internal state, and Foldkit sees the same surface a vanilla JS or React consumer would. Most modern web component libraries (Shoelace, UI5, Spectrum, Lit, Stencil) fit this shape by design.

[Mount](/core/mount) stays the right primitive when the foreign API is imperative: when you need to call `new Map({ container }).flyTo(...)`, `editor.setValue(text)`, `dialog.showModal()`, or otherwise drive the element through method calls rather than property writes. `OnMount` hands you the live `Element` so you can instantiate the library, call methods on it, and pair a cleanup. The [Map example](/example-apps/map) is the canonical shape.

The [Web Components example](/example-apps/web-components) pairs two real third-party elements: `<hex-color-picker>` from `vanilla-colorful` emits color-changed CustomEvents that flow back as Messages, and `<sl-qr-code>` from `@shoelace-style/shoelace` accepts typed properties that the runtime diffs through `propsModule`. The picker and the QR code never touch each other directly; they share state through the Model.
