# View

## Overview

The view function turns your Model into HTML. The user doesn’t see the Model directly. They see what view renders from it.

In the [restaurant analogy](/core/architecture#the-restaurant-analogy), the waiter’s notebook says “table 3: salmon, ready.” The view is what’s actually on the table: the plate in front of the customer.

Given the same Model, view always produces the same HTML. It never modifies state directly. Instead, it dispatches Messages through event handlers, feeding them back into the loop.

::Snippet{name="counterView" label="view example"}

:::Info{label="No hook rules"}
In React, functional components can hold local state and run effects via hooks, which come with ordering rules you have to follow. In Foldkit, view is guaranteed pure: no hooks, no effects, no local state. It’s a function from Model to Html.
:::

## The Document

A `makeApplication` view returns a `Document` rather than bare HTML. A Document is everything the runtime needs to render one frame: the body to patch into the container, plus the document-level state that should track the Model.

| Field       | Type                       | Required | What the runtime does with it                                                                  |
| ----------- | -------------------------- | -------- | ---------------------------------------------------------------------------------------------- |
| `title`     | `string`                   | Yes      | Writes it to `document.title`, so the browser tab tracks the current page.                     |
| `body`      | `Html`                     | Yes      | Patches it into the application container.                                                     |
| `lang`      | `string`                   | No       | Syncs it to `lang` on `<html>`. Omit it and the current value stands.                          |
| `dir`       | `'Ltr' \| 'Rtl' \| 'Auto'` | No       | Syncs it to `dir` on `<html>`, lowercased. Omit it and the current value stands.               |
| `canonical` | `string`                   | No       | Syncs it to `<link rel="canonical">`, creating the tag if absent. Defaults to the current URL. |
| `ogUrl`     | `string`                   | No       | Syncs it to `<meta property="og:url">`, creating the tag if absent. Defaults to `canonical`.   |

Every field is a function of the Model, exactly like `body`. There is no imperative `setTitle` and no separate head-management API: you return the values you want and the runtime makes the document match on each render.

A `makeElement` view returns `Html` directly instead of a `Document`. An embedded app does not own the page, so it has no title or document metadata to declare, and the rest of this section does not apply to it. Everything on this page outside this section applies to both. See [Runtime](/core/runtime#make-element) for which of the two to reach for.

### Language and direction

`lang` and `dir` sync to the `<html>` element. Drive them from the Model when the app switches language at runtime, the same way `title` tracks the current page.

::Snippet{name="documentLanguage" label="Localized document example"}

`dir` takes `'Ltr'`, `'Rtl'`, or `'Auto'`, which the runtime writes as the lowercase `dir` attribute values. `Auto` hands the decision to the browser's first-strong-character heuristic. `foldkit/html` exports `TextDirection` as a Schema, so a Model that stores the direction rather than deriving it can drop the field straight into an `S.Struct`.

Neither field has a default. When a view omits one, the runtime does not touch that attribute, leaving whatever value it currently holds, so a view that never sets it leaves the `lang` from your `index.html` in place. That is the right behavior for an app that ships in one language, and it means adding these fields never changes an existing app.

The runtime can only sync after the first render, so the served HTML still decides what a crawler sees on first paint. When the language is known per request, stamp `<html lang>` in the HTML shell and let the runtime keep it in sync from there. The runtime sync is what a screen reader picks up when a user flips the language switcher, which is the part a static shell cannot do.

To mark up a passage in a different language from the page, use the `Lang` attribute on that element instead. `Document.lang` is only the root.

### Canonical and share URLs

`canonical` and `ogUrl` keep `<link rel="canonical">` and `<meta property="og:url">` current as you navigate, so a platform share menu copies the link for the route the user is actually on rather than the one the page was first served as.

Set neither and both fall back to the current URL, which is what a routed app usually wants. The two are chained rather than independent: `canonical` falls back to the current URL, and `ogUrl` falls back to the resolved `canonical`, so setting `canonical` alone moves both. Set them explicitly when the canonical URL differs from the address bar, such as a paginated list whose later pages should point back at the first.

## Typed HTML Helpers

Foldkit’s HTML functions are typed to your Message type. This ensures event handlers only accept valid Messages from your application. Every view receives `h`, the typed Html builder, alongside the Model: the runtime passes one to your root view, and `Submodel.defineView` passes one to each child view. Reach for `h.div`, `h.OnClick`, and the rest off it:

::Snippet{name="htmlHelpers" label="HTML helpers example"}

This gives you strong type safety: if you try to pass an invalid Message to `h.OnClick`, TypeScript catches it at compile time.

An element builder takes attributes first and children second. Children are optional, so an element that has none omits the argument rather than spelling out an empty array: `h.div([h.Class('divider')])`. Attributes stay required, which leaves `h.div([])` as the spelling for an element with neither. `h.keyed` has the same shape with the key ahead of the pair, so a childless keyed row is `h.keyed('li')(row.id, [h.Class('h-8')])`. Void elements like `h.img` and `h.br` take attributes only and reject a children argument outright, so sibling elements sitting at different arities is normal rather than a sign that one of them is wrong. The `foldkit/no-empty-children-array` [lint rule](/tooling/oxlint-plugin#no-empty-children-array) catches a trailing `[]` that carries no information.

Application code cannot construct a builder; `h` only enters a view as a parameter. That is what keeps the typing truthful. The builder is supplied by the render frame it will dispatch into, so its Message type cannot disagree with the boundary that routes its handlers. When you extract a view helper, take `h: HtmlBuilder<Message>` as its last parameter and let callers thread theirs through. A helper meant to work under any parent takes `ParentMessage` as a function generic with `h: HtmlBuilder<ParentMessage>`, staying decoupled from any particular parent and composing through the callbacks the parent supplies.

Where no builder is in scope, typically module scope, `foldkit/html` exports `inertHtml`. It is typed `HtmlBuilder<never>`: elements and styling attributes work, and no event handler can be constructed with it, so nothing built with it can dispatch a Message. Inert describes what the result can do, not how it is computed; the markup is still free to vary with runtime data. Its attributes are `Attribute<never>` and flow into any Message universe, which is what lets library code hand out handler-free attribute bundles. Import it aliased as `ih`, which reads as the inert counterpart to `h` and keeps the two distinguishable at every call site. Inside a view, use the view's own `h` rather than reaching past it.

Inert to Foldkit's dispatch, not to the browser. A raw DOM attribute still does whatever the browser makes of it, which is how the [crash view](/core/crash-view) gets a working reload button with `h.Attribute('onclick', 'location.reload()')`. What `never` rules out is a Message reaching `update`, not every possible behavior.

## Event Handling

When the customer flags the waiter, that’s a Message. In the view, event handlers work the same way. Instead of imperative callbacks that modify state, you pass a Message, or a function that maps an event to a Message.

::Snippet{name="eventHandling" label="event handling example"}

For simple events like clicks, you pass the Message directly. For events that carry data (like input changes), you pass a function that receives the event and returns a Message. This keeps your view declarative. It describes what Messages should be sent, not how to handle them.

## Complex Handlers

The examples above are short, but handlers are not limited to one-liners. The rule is that a handler is a pure translator from event data to a Message, not that it stays small. For example, a keydown translator can branch on the key, read Model-derived state from view scope, and return `Option<Message>` so it dispatches only when the event means something:

::Snippet{name="eventHandlingComplex" label="complex handler example"}

Returning `Some` claims the key: the framework suppresses the browser’s default action and dispatches the Message. Returning `None` leaves the key to the browser. The next section covers why `OnKeyDownPreventDefault` runs that suppression for you.

A handler never runs Effects: the runtime is the only Effect executor, and anything effectful belongs in a Command returned from update. A handler also never decides consequences: it classifies the event into a fact, like Enter with an active result meaning `SelectedResult`, and update decides what follows from that fact.

When a translator grows, extract it to a named pure function and pass it to the attribute, as the example above does with `handleResultsKeyDown`. Foldkit’s own Listbox does the same: its keydown handler matches on Escape, Enter, Space, the navigation keys, and printable typeahead keys, with Model-derived state in scope, all as one pure function handed to `OnKeyDownPreventDefault`.

## Event Handler Side Effects

Foldkit runs your side effects for you. Your view only declares attributes and returns Messages. Usually Foldkit defers those effects to lifecycle primitives like Commands, Subscriptions, and Mounts, which run after the current event has returned. A few effects cannot wait that long. The browser only honors them when they run synchronously, inside the originating user-gesture event handler, and a deferred primitive runs a frame too late. Foldkit handles those from inside the event attribute itself. It is still Foldkit running the effect, not your view.

Two cases show up in practice. `event.preventDefault()` must run synchronously to suppress a default browser action like form submission or scroll. `.focus()` on iOS Safari only opens the on-screen keyboard if it runs inside the gesture; the same call from a Command resolves a frame later and the keyboard never appears.

Foldkit exposes these as attribute primitives. `OnKeyDownPreventDefault` takes a function returning `Option<Message>`. When the function returns `Some`, the framework calls `preventDefault` and dispatches the Message. `OnClickFocus` takes a selector and a Message; it synchronously focuses the element matching the selector and then dispatches.

The clipboard family follows the same rule. `OnPastePreventDefault` hands your function the clipboard’s text/plain payload. Returning `Some` suppresses the browser’s default insertion and dispatches the Message carrying the pasted content; `None` lets the browser paste normally. `OnCopyText` and `OnCutText` go the other way: they write Model-derived text to the clipboard and call `preventDefault` inside the gesture, since the clipboard is only writable there. The cut variant also dispatches a Message so update can remove the cut content from the Model.

::Snippet{name="eventHandlerSideEffects" label="event handler side effects example"}

The iOS keyboard case has one wrinkle. The element you focus has to be in the page at the instant of the tap. A search field inside a dialog is not: while the dialog is closed its input is not rendered, and opening the dialog does not help because that happens a frame later, after the gesture has ended.

:::Info{label="Focus a stand-in, then hand off"}
Keep an always-present, visually hidden text input (the “keyboard warmup”) and point OnClickFocus at it. The tap focuses the warmup (which opens the keyboard) and dispatches a Message. update’s branch for that Message opens the dialog and returns a Dom.focus Command pointed at the real input. It runs once the dialog has mounted, so focus lands on the real input, and iOS keeps the keyboard up as focus moves between the two text inputs.
:::

These are ordinary declarative attributes, not an escape hatch into imperative code. Foldkit still owns the side effect and runs it inside the framework’s handler, so your callbacks stay pure and your Messages stay facts. Reach for them only when the browser requires a synchronous side effect inside the gesture. Anything that can wait belongs in the normal lifecycle, usually a Command.

So far everything has been synchronous. The user clicks a button, update produces a new Model, the view rerenders. But real apps need side effects: HTTP requests, timers, browser APIs. That’s where Commands come in.
