# Messages

## Facts, Not Instructions {#overview}

A Message records something that happened in the application. It does not prescribe the response. The update function decides what the fact means for the current Model.

`ClickedIncrement` does not mean “add one.” It records that the user clicked the increment button. In this counter, update adds one. A later version may return a Command that obtains the next value elsewhere. The Message remains a stable account of the event.

The counter has three Messages:

::Snippet{name="counterMessages" label="messages example"}

Messages use verb-first, past-tense names such as `ClickedIncrement`, not `Increment` or `ADD_COUNT`. Prefixes make their causes easy to scan. `Clicked*` records clicks, and `Updated*` records input changes. Command results use `Succeeded*` or `Failed*` when the distinction matters, and `Completed*` otherwise. `Got*` is reserved for results lifted from a child [Submodel](/core/submodel).

The `m()` helper creates a Schema-backed tagged struct with a callable constructor. `m('ClickedIncrement')` provides both the tag that update can match and the `ClickedIncrement()` constructor that creates the Message. `S.Union` then collects every variant into the application’s closed `Message` union.

:::Info{label="Name the cause"}
A Message says what happened, not what update intends to do next. That keeps the same fact useful when the application’s response changes.
:::

Messages describe what happened. The [update function](/core/update) defines every resulting state transition.
