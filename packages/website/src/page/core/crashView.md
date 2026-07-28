# Crash View

## Overview

When Foldkit hits an unrecoverable error during `update`, `view`, or Command execution, it stops all processing and renders a fallback UI. This is not error handling. There is no recovery from this state. The runtime is dead.

By default, Foldkit shows a built-in crash screen with the error message and a reload button. Pass a `crash.view` function to `makeApplication` to customize it. It receives a `CrashContext` containing the `error`, the `model` at the time of the crash, and the `message` being processed as an `Option` (it is absent when the crash happens during the initial render), plus the builder `h` as its second parameter:

::Snippet{name="crashViewCustom" label="Custom crash view example"}

The builder is typed `HtmlBuilder<never>`. The runtime has stopped, so no Message it produced could ever reach `update`, and `never` makes that structural: every handler constructor takes a Message, and no value of type `never` exists, so `h.OnClick(...)` is a compile error rather than a handler that silently does nothing. For interactivity, like a reload button, use `h.Attribute('onclick', 'location.reload()')`. This sets a raw DOM event handler directly on the element, bypassing Foldkit’s dispatch system entirely.

:::Info{label="Only in crash.view"}
In a normal Foldkit app, always use `OnClick` with Messages, never raw DOM event attributes. `crash.view` is the one exception because the runtime is no longer running.
:::

If your custom `crash.view` itself throws an error, Foldkit catches it and falls back to the default crash screen showing both the original error and the `crash.view` error.

## Crash Reporting {#crash-report}

Use `crash.report` to run side effects when the app crashes, like sending the error to Sentry or another logging service. It receives the same `CrashContext` as `crash.view`, giving you access to the error, Model, and Message:

::Snippet{name="crashReport" label="Crash reporting example"}

`crash.report` is a synchronous callback. The runtime is dead at this point, so there is no Effect runtime to schedule work on. If you need async behavior (like flushing a logging buffer), fire it from within the callback yourself.

`crash.report` runs before `crash.view` renders. If `crash.report` throws, Foldkit catches the error, logs it to the console, and continues rendering the crash view.

See the [crash-view example](/example-apps/crash-view) for a working demonstration.

The next two pages cover how Foldkit warns you about slow synchronous phases during development and how to memoize expensive subtrees.
