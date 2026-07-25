# View

## Overview

The view function turns your Model into HTML. The user doesn’t see the Model directly. They see what view renders from it.

In the [restaurant analogy](/core/architecture#the-restaurant-analogy), the waiter’s notebook says “table 3: salmon, ready.” The view is what’s actually on the table: the plate in front of the customer.

Given the same Model, view always produces the same HTML. It never modifies state directly. Instead, it dispatches Messages through event handlers, feeding them back into the loop.

::Snippet{name="counterView" label="view example"}

:::Info{label="No hook rules"}
In React, functional components can hold local state and run effects via hooks, which come with ordering rules you have to follow. In Foldkit, view is guaranteed pure: no hooks, no effects, no local state. It’s a function from Model to Html.
:::

## Typed HTML Helpers

Foldkit’s HTML functions are typed to your Message type. This ensures event handlers only accept valid Messages from your application. Bind the factory once per module by calling `html<Message>()`, then reach for `h.div`, `h.OnClick`, and the rest off the returned record:

::Snippet{name="htmlHelpers" label="HTML helpers example"}

This gives you strong type safety: if you try to pass an invalid Message to `h.OnClick`, TypeScript catches it at compile time. Each view module binds its own `h` against the Message type it dispatches.

In a child view that should be agnostic to its parent, take `ParentMessage` as a function generic and bind `html<ParentMessage>()` inside. The view stays decoupled from any particular parent and composes through the `toParentMessage` callback the parent supplies.

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
