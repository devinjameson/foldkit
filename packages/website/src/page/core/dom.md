# Dom

## Overview

The `Dom` module wraps the most common DOM operations as Effects: focusing an element, scrolling something into view, programmatically clicking, opening and closing dialogs, locking page scroll, marking surrounding elements inert. You use them inside your own [Commands](/core/commands).

Each helper is an Effect. `Dom.focus` returns an `Effect.Effect<void, ElementNotFound>`; `Dom.lockScroll` returns an `Effect.Effect<void>`. They gate themselves on the runtime's next render commit internally, so you can return one from `update` immediately after a state-changing Message and trust the element will be there.

## Using Dom

Wrap a Dom helper in a Command at the call site. The helper produces a value (or fails with a typed error), and you map that into one of your Messages.

::Snippet{name="domFocus" label="Dom.focus example"}

Dom helpers that touch a specific element can fail. `Dom.focus`, `Dom.scrollIntoView`, `Dom.scrollIntoViewAfterPaint`, `Dom.scrollIntoViewIfNotVisible`, `Dom.clickElement`, and `Dom.advanceFocus` all fail with `ElementNotFound` when the selector does not match. Catch the failure with `Effect.catch` and turn it into a Message, or ignore it with `Effect.ignore` when the failure is not interesting (a stale focus call after the user has navigated away).

## Full API surface

The Dom module covers focus management, scrolling, dialog show/close, scroll locking, inert isolation, element movement detection, and animation settling. The [Dom API reference](/api-reference/dom) lists every function with its signature and an inline example.
