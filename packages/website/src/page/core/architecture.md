# Architecture

## Overview

In most TypeScript UI frameworks, each component manages its own state and effects. In Foldkit, there’s a single state tree. Every change flows in one direction through the same loop.

This pattern is called [The Elm Architecture](https://guide.elm-lang.org/architecture/). You don’t need to know Elm. Foldkit adapts it for TypeScript and Effect.

## The Loop

Every Foldkit app runs the same loop. A `Message` arrives: the user clicked a button, a timer fired, an HTTP response came back. The `update` function receives the current `Model` and the Message and returns a new Model along with any `Command`s to execute. The `view` function renders the new Model as HTML. When the user interacts with the view, it produces another Message, and the loop continues.

- **Commands:** descriptions of one-shot side effects: HTTP requests, focus operations, `localStorage` writes, navigation calls. The Foldkit runtime executes them and sends their results back as new Messages, feeding them into the same loop. Each Command carries a name, which surfaces in [DevTools](/core/devtools), [tests](/testing), and tracing.
- **Mount:** an Effect scoped to the lifetime of an element in the live DOM. Mount is the seam where view code can drop down to imperative work with the live element. For example: portaling an overlay to the document body, attaching observers, or handing the element to a third-party library that owns its own DOM. `Mount.define` runs an Effect that emits a single Message at acquire; `Mount.defineStream` runs a Stream of Messages from observers or listeners on the element. The runtime dispatches results back through `update` and runs the paired cleanup when the element unmounts.
- **Subscriptions:** a scoped Stream gated by a slice of your Model. You are subscribed to the Model, not to an external event source. The runtime keeps the Stream alive while the slice holds its value and starts a fresh scope when the slice changes. The body usually plugs an external source (timer ticks, keypresses, `WebSocket` frames, system theme changes) into a Stream that flows back through `update` as Messages. Some Subscriptions emit no Messages and instead maintain DOM state for their lifetime, like setting `user-select: none` while a drag is active.
- **ManagedResources:** declarations of a resource (a camera stream, a `WebSocket` connection, a Web Worker pool) made available to Commands and Subscriptions while a slice of the Model holds a particular value. The runtime acquires the resource when the slice says it should be alive, releases it when the slice says it should not, and dispatches Messages for each lifecycle transition. Commands and Subscriptions consume the resource as a typed handle (capturing a photo from the camera, sending a frame on the socket), with `ResourceNotAvailable` rather than a crash if the handle is not currently available.

That’s it. Every state transition in your app flows through a single loop. There’s no action-at-a-distance, no hidden state mutation, no effect that runs outside the cycle. If you want to know how the app got into its current state, you follow the Messages.

The complete cycle looks like this:

```diagram
          +------------------------------------------------------+
          |                                                      |
          ↓                                                      |
       Message                                                   |
          |                                                      |
          ↓                                                      |
  +---------------+                                              |
  |    update     |                                              |
  +-------+-------+                                              |
  ↓               ↓                                              |
Model    Array<Command<Message>>                                 |
  |               |                                              |
  |               +-> Runtime -----------------------------------+
  |                                                              |
  +-> view -> Browser -> user events ----------------------------+
  |                                                              |
  +-> view -> Mount(Element) -> Effect<Message> -> Runtime ------+
  |                                                              |
  +-> Subscriptions -> Stream<Message> -> Runtime ---------------+
  |                                                              |
  +-> ManagedResources -> acquire/release Messages -> Runtime ---+
```

Every path on the right side produces a Message that feeds back into `update`. Five sources: Commands, the Browser, Mount, Subscriptions, and ManagedResources. One loop.

Sitting beneath the loop are Resources: app-lifetime singletons like an `RpcClient`, an analytics client, or a background compute worker that Commands draw on. Resources don’t produce Messages themselves. They’re the ambient dependencies the Message-producing parts need to do their work.

## Definitions

Each concept in one place, in plain terms:

| Concept         | Definition                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Model           | The single data structure that holds your entire application state.                                                                                                                                                                                                                                                                                                                                                                                                           |
| Message         | A fact about something that happened: a button was clicked, a key was pressed, a request succeeded with a payload.                                                                                                                                                                                                                                                                                                                                                            |
| update          | A pure function that receives the current Model and a Message and returns a new Model along with any Commands to execute.                                                                                                                                                                                                                                                                                                                                                     |
| view            | A pure function that renders the Model as HTML. User interactions produce Messages that flow back into update.                                                                                                                                                                                                                                                                                                                                                                |
| Command         | A description of a one-shot side effect. The runtime executes it and sends the result back as one of its declared Messages.                                                                                                                                                                                                                                                                                                                                                   |
| Mount           | The seam where view code reaches a live DOM element. Mount.define runs an Effect that emits a single Message at acquire; Mount.defineStream runs a Stream of Messages from observers on the element. The runtime dispatches results through update and runs the paired cleanup on unmount.                                                                                                                                                                                    |
| Subscription    | A scoped Stream gated by a slice of your Model. The runtime keeps it alive while the slice holds its value and starts a fresh scope when the slice changes. The body usually pipes external events back as Messages; some Subscriptions emit nothing and just maintain DOM state for the subscription’s lifetime.                                                                                                                                                             |
| Resource        | An app-lifetime singleton (an RPC client, an analytics client, a compute worker) that Commands can draw on. A dependency, not a Message source.                                                                                                                                                                                                                                                                                                                               |
| ManagedResource | Like a Resource, but scoped to a window of Model state instead of the app lifetime: a WebSocket connection while the user is on a chat page, a camera stream during a video call. Commands and Subscriptions consume it as a typed handle while it’s live; the runtime acquires it on entry, releases it on exit, and dispatches Messages for each lifecycle transition.                                                                                                      |
| Runtime         | The Foldkit engine that executes Commands, runs Subscriptions, manages resource and mount lifecycles, and routes Messages back into update.                                                                                                                                                                                                                                                                                                                                   |
| Submodel        | A self-contained Model, Message, update, and Commands that a parent embeds as a field and delegates to in update. Submodels are how an app grows past a single update function: the stateful Foldkit UI components (Menu, Listbox, DatePicker, and friends) ship as Submodels, and you build your own for feature pages, repeated forms, or any unit of composition. Children surface high-level facts to parents through an OutMessage in the third tuple element of update. |

## The Restaurant Analogy

Think of a Foldkit app like a restaurant. The waiter keeps a notebook: a running picture of everything happening right now. Table 3 ordered the salmon. Table 5 is waiting for dessert. When something happens (a customer flags the waiter, the kitchen rings the bell), the waiter hears about it, updates their notebook, and maybe writes a slip for the kitchen. The waiter doesn’t cook the salmon. They hand the slip to the kitchen, and the kitchen reports back when it’s done.

Messages work the same way. “Table 3 asked for the check” is a fact given to the waiter, not an instruction. The waiter decides what to do: maybe bring the check immediately, maybe offer dessert first. The message stays the same either way.

:::Info{label="The restaurant analogy"}
This analogy maps to every concept you’ll encounter in Core Concepts. The table below is a reference you can come back to as you read.
:::

| Foldkit         | Restaurant                                                                                                                  |
| --------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Model           | The waiter’s notebook: the current state of everything                                                                      |
| Message         | Something that happens: “table 3 asked for the check”                                                                       |
| update          | The waiter: hears what happened, updates the notebook, maybe writes a slip                                                  |
| view            | What the customers actually see: plates on the table, the check arriving                                                    |
| Command         | A slip for the kitchen: “prepare the salmon”                                                                                |
| Mount           | Tableside flambé: rolled out to a specific table the moment its dish arrives, rolled away when the plate is cleared         |
| Subscription    | A standing order: “keep the coffee coming for table 5”                                                                      |
| Resource        | Kitchen equipment: the oven, the stand mixer, the deep fryer. Turned on when the kitchen opens and available to every dish. |
| ManagedResource | A specialty station: set up when the menu features the seafood special, broken down when the special ends                   |
| Runtime         | The kitchen: does the work, reports back when done                                                                          |

That’s the architecture in the abstract. The next page shows a complete counter application: the core of the loop (a Model, Messages, `update`, `init`, and `view`) wired together and running.
