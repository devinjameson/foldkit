# Coming from React

If you know React, you already have the instincts for building UIs. Foldkit channels those instincts through a different structure: one where every state change, every side effect, and every event is explicit and visible. The best way to feel the difference is to build the same thing in both.

Foldkit doesn’t compete with React on brevity, and it isn’t trying to. The first counter you see below is longer than its React counterpart, and the shape will feel unfamiliar: a separate Model, Message union, update function, and view, where React fits the same idea into a single component with a hook. That gap is the point. Foldkit names every piece React leaves implicit (state, events, side effects, subscriptions) so they stay legible as the app grows.

The trade is upfront verbosity for structural guarantees that compound. If you read the small example and think “that’s a lot of code for a counter,” you’re right. Keep reading: the next two sections add features that turn React into stale-closure debugging and leave Foldkit unchanged in shape.

## A Simple Counter

A counter in React:

::Snippet{name="reactCounter" label="React counter" class="mb-4"}

The same counter in Foldkit:

::Snippet{name="foldkitCounter" label="Foldkit counter" class="mb-6"}

More lines, same result. At this scale, Foldkit’s structure (Model, Message, update, view) looks like overhead. The benefits come with scale. Every piece earns its place as more complex behavior is introduced.

## Adding Auto-Count

New requirement: a play/pause button that auto-increments the counter every second.

React adds a ref to hold the interval ID and a `useEffect` to start and stop the interval:

::Snippet{name="reactCounterAutoCount" label="React counter with auto-count" class="mb-4"}

The interval state lives outside React’s state system (in a ref) because the effect needs to clear the previous interval before starting a new one. The cleanup function is critical: miss it and you leak intervals.

Foldkit adds a Subscription and a Message:

::Snippet{name="foldkitCounterAutoCount" label="Foldkit counter with auto-count" class="mb-6"}

The Subscription emits `Ticked` every second while `isAutoCounting` is true. Foldkit manages the stream lifecycle: starts it when the dependency changes to true, tears it down when it changes to false. No refs, no manual cleanup.

## Adding a Step Size

One more feature: an input that controls how much each tick and manual click increments by.

This is where the React version gets subtle. The `setInterval` callback captures `step` at creation time. If you change the step while playing, the interval keeps using the old value: a stale closure. Nothing flags it at build time; the counter just increments by the wrong amount. React’s current fix is `useEffectEvent`, stable since 19.2: declare the tick as an Effect Event and every call reads current state:

::Snippet{name="reactCounterStepSize" label="React counter with step size" class="mb-4"}

This is React’s best answer, and look at what it asks of you. First you meet the bug at runtime, because nothing flags a stale closure. Then you classify the read: `step` must be non-reactive here, so it belongs in an Effect Event. The nearest wrong answer is silent: for the naive version, `react-hooks/exhaustive-deps` suggests adding `step` to the dependency array instead, which restarts the interval on every keystroke and quietly resets its rhythm. And codebases older than React 19.2 solve this with a ref plus a sync effect to carry the current value past the closure, a pattern you will still meet everywhere. Most React developers have been burned by this.

In Foldkit, there is no stale closure:

::Snippet{name="foldkitCounterStepSize" label="Foldkit counter with step size" class="mb-6"}

`model.step` is always current. The update function receives the latest Model every time a Message arrives. Both `ClickedIncrement` and `Ticked` use `model.step` and it just works. No refs, no Effect Events, and no deciding which reads are reactive.

Read the update function top to bottom. Every behavior in the app is right there. Each case is independent. They don’t interact through shared mutable state or overlapping effect dependencies. Adding a feature meant adding cases, not restructuring existing ones.

:::Info{label="The pattern"}
In React, each new feature interacts with the effects, refs, and closures already there. In Foldkit, each new feature adds Messages, update cases, and possibly Commands or Subscriptions to structures that already exist, and the cases don’t interact through shared mutable state.
:::

This structure also makes testing trivial. Your update function is pure. Pass a Model and a Message, assert on the returned Model. No rendering, no mocking `useEffect`, no wrapping in providers.

This is a toy example. Consider what happens at real scale: a multiplayer game with WebSocket streams, a mix of client and server state, handling keyboard events, animations, and reconnection logic. In React, every feature adds effects that interact with every other effect. In Foldkit, the architecture is the same as the counter: Messages come in, the update function decides what to do, Commands and Subscriptions handle the rest. The complexity of your domain grows, but the complexity of your architecture doesn’t.

## Translating React Concepts

Here’s how React patterns map to Foldkit:

| React Ecosystem                     | Foldkit                                                                  |
| ----------------------------------- | ------------------------------------------------------------------------ |
| `useState`                          | Model (single state tree)                                                |
| `useReducer`                        | `update` function                                                        |
| `useEffect` (one-off)               | Commands (returned from `update`)                                        |
| `useRef` + `useEffect` (DOM access) | Mount (`OnMount` with paired cleanup)                                    |
| `useContext` / Redux / Zustand      | Single Model (no prop drilling)                                          |
| `useMemo` / `useCallback`           | `createLazy` / `createKeyedLazy` (memoize on data, not closure identity) |
| Custom hooks                        | Domain modules with pure functions                                       |
| JSX                                 | Plain functions from Model to HTML                                       |
| Component props                     | Function parameters                                                      |
| Component state                     | Part of the single Model                                                 |
| Event handlers                      | Messages dispatched to `update`                                          |
| React Router / TanStack Router      | Built-in typed routing                                                   |
| React Hook Form / Formik            | Model + Messages + `foldkit/fieldValidation`                             |
| Event streams (useEffect / RxJS)    | Subscriptions (automatic lifecycle)                                      |
| Headless UI / Radix UI              | Foldkit UI (headless, typed components)                                  |
| Error boundaries                    | Typed errors in Effects + `crash.view`                                   |

:::Info{label="If you know Redux..."}
The Model-View-Update pattern will feel familiar. Think of the Model as your Redux store, Messages as actions, and update as your reducer, but without action creators, selectors, or middleware.
:::

## FAQ

:::Faq{id="faq-reusable-components" question="How do I make reusable “components”?"}
Create functions that take parts of your Model and return Html. They’re not components in the React sense (they don’t have their own state or lifecycle), but they’re reusable view logic. For complex features that need their own state, use the [Submodel](/core/submodel) pattern: the child module gets its own Model, Message, and update, and the parent embeds and delegates to it.
:::

:::Faq{id="faq-multiple-instances" question="How do I create multiple components with their own state?"}
State always lives in your Model, and views are functions from Model to Html. For multiple instances with independent state, model each one explicitly:

::Snippet{name="multipleInstances" label="Model example" class="mb-4"}

Each `Accordion.Model` is a Submodel: a self-contained piece of state with its own Messages, update, and view. This is similar to what React developers end up doing anyway (lifting state into a parent), but Foldkit enforces it from the start. See the [Shopping Cart example](/example-apps/shopping-cart) for a concrete implementation.
:::

:::Faq{id="faq-routing" question="How does routing work?"}
Foldkit has built-in typed routing with bidirectional parsers: define routes once, use them for both URL parsing and URL building. See [Routing & Navigation](/core/routing-and-navigation).
:::

:::Faq{id="faq-forms" question="What about forms?"}
Form state lives in your Model, inputs dispatch Messages, and update handles validation. Foldkit ships a [field validation](/core/field-validation) module with four-state fields (`NotValidated`, `Validating`, `Valid`, `Invalid`), and [Foldkit UI](/ui/overview) provides headless components like Combobox and Listbox for richer form controls. See the [Form example](/example-apps/form).
:::

:::Faq{id="faq-ui-components" question="What about Headless UI, Radix, or Shadcn?"}
[Foldkit UI](/ui/overview) is a first-party set of headless, accessible components: Dialog, Combobox, Listbox, Menu, Popover, and more. Each one follows The Elm Architecture with its own Model, Message, and update, and integrates into your app via the Submodels pattern. You provide the markup and styling; Foldkit UI provides the accessibility attributes, keyboard navigation, and state management.
:::

:::Faq{id="faq-react-compiler" question="What about React Compiler?"}
React Compiler, stable since October 2025, automatically memoizes components that follow the Rules of React, replacing most hand-written `memo`, `useMemo`, and `useCallback`. If you stay in React, evaluate it; it addresses a real cost. What it does not change is the architecture this page is about: state still lives across hooks and libraries rather than in one Model, side effects still live in `useEffect` bodies with dependency arrays, and none of it is visible to the reducer, the type system, or a unit test.

Foldkit’s equivalent of memoization is [createLazy and createKeyedLazy](/core/view-memoization), keyed on Model data instead of closure identity. See the [Foldkit vs React comparison](/react/foldkit-vs-react-side-by-side) for the full side by side.
:::

:::Faq{id="faq-data-fetching" question="How do I fetch data?"}
Return a Command from your update function. The runtime runs the Command (an HTTP request, a localStorage read, a DOM focus call, whatever side effect you need) and feeds the resulting Message back into update. No `useEffect`, no cleanup functions, no race conditions. See the [Weather example](https://github.com/foldkit/foldkit/blob/main/examples/weather/src/main.ts#L153-L232) for a complete implementation.
:::

:::Faq{id="faq-testing" question="How do I test my app?"}
Foldkit ships two built-in testing APIs that share the runtime’s pipeline. No jsdom, no mocking, no async waiting.

[Story](/testing/story) tests the state machine. You feed Messages into update, resolve Commands inline by providing the Message they would return, and assert on the Model at any step. The test reads as a chronological user story: `message` to dispatch, `Command.resolve` to settle a Command, `Command.expectExact` to assert which Commands were produced.

[Scene](/testing/scene) tests through the rendered view. Locate elements by accessible role, label, or text (the same way a screen reader does), click and type to dispatch the same Messages a user would, and assert on the rendered VNode tree. Scene runs against the virtual DOM, so the entire test stays synchronous.

Both APIs run the same update function the runtime runs, so removing or renaming a Command breaks every test that depended on it. See the [Weather example](/example-apps/weather) for end-to-end Story and Scene tests of the same app.
:::

:::Faq{id="faq-where-to-start" question="I’m sold. Where do I start?"}
Head to [Getting Started](/get-started/getting-started) to create your first Foldkit app, then read the [Counter Example](/core/counter-example) to understand each piece in depth.
:::
