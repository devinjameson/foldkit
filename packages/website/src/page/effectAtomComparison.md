# Foldkit vs React + Effect Atom

## Overview

This page is for people who have already chosen Effect. [Effect Atom](https://github.com/tim-smart/effect-atom) is a reactive, atomic state-management library: state is a set of small cells, each an independent piece of state, read and written through a host view framework. The core is framework-agnostic, with bindings for React, Solid, and Vue; the framework does the rendering, and Effect Atom is the state layer. Foldkit is a framework. It owns its runtime and view layer, renders through a virtual DOM built on [Snabbdom](https://github.com/snabbdom/snabbdom), ships a routing module and a UI library, includes Story and Scene testing, and implements the Elm Architecture in TypeScript: one Model, one Message union, one update function, side effects as values returned to the runtime.

So the difference is not a narrow one about where state lives. Adopting Effect Atom means building a React (or Solid, or Vue) app and reaching for atoms as the state layer. Adopting Foldkit means building a Foldkit app. They are different paradigms that happen to both use Effect.

:::Info{label="Related page"}
This page assumes you are sold on Effect. If you are coming from plain React, the [Foldkit vs React](/react/foldkit-vs-react-side-by-side) comparison makes the broader case for this style of architecture.
:::

## What They Share

The common ground is Effect itself, and that is most of what they share. Both can express asynchronous work and side effects as Effect values: in Effect Atom you hand an Effect to `Atom.make` or `runtime.fn`; in Foldkit you return a Command that wraps one. Both put errors in the type signature, both use Schema for validation at the boundary, and both lean on Layers and structured concurrency. Above that foundation they diverge completely. Effect Atom is the state layer and defers rendering, the component model, and routing to its host framework; Foldkit owns the whole stack, from its runtime and Snabbdom-based virtual DOM up through routing and its UI library.

## Many Atoms vs One Model

An atom is a reactive container for one value. You create it with `Atom.make`, read it with `useAtomValue`, write it with `useAtomSet`, and derive new atoms from existing ones with `get`. The registry tracks dependencies between atoms and re-renders the components that read a changed atom.

State is therefore distributed by design, and that distribution is the point: a feature owns its atoms, adding one touches no shared file, and independent features evolve without coordinating through a common update. Ten features mean a spread of atoms, each an independent piece of state, each writable from any component that imports it. There is no single value that is “the state of the app,” and no single place that enumerates how it can change. This is the atomic model working as intended, the same as [Jotai](https://jotai.org).

Foldkit centralizes by design. The [Model](/core/model) is one value. The [Message](/core/messages) union is the closed set of facts that can change it. The [update](/core/update) function is the only place those transitions are defined. Those three facts are framework constraints, not conventions you maintain by discipline. The properties Foldkit claims downstream (a complete index of state transitions, [a single replayable timeline](/core/devtools), [tests with nothing to mock](/testing)) follow from that one constraint.

## How State Changes

Start with the most common operation in any frontend app: changing state. The difference shows up immediately, and it is the difference everything else rests on.

### Effect Atom: setters at the call site {#atom-state}

With Effect Atom, a write is a setter from `useAtomSet`, usually called with an inline updater function. The transition is whatever closure you pass, defined wherever the button lives.

::Snippet{name="atomCompareAtomState" label="Effect Atom state"}

Each transition is an anonymous function: `(todos) => [...todos, emptyTodo()]` in one component, `(todos) => todos.filter(...)` in another. There is no name for “add a todo,” no value that represents it, and no one place that lists every way `todosAtom` can change. To answer that, you grep for `useAtomSet(todosAtom)` and read the closures at each call site. You can encapsulate these writes into named functions, so “add a todo” has a name and one home. Nothing forces the inline scatter. The difference is enforcement: Foldkit makes the single catalog mandatory, where an atom app keeps it by convention.

### Foldkit: one Message union, one update {#foldkit-state}

In Foldkit the same three transitions are three Messages, handled in one update function. The Message union is the complete catalog; `M.tagsExhaustive` makes a forgotten case a compile error.

::Snippet{name="atomCompareFoldkitState" label="Foldkit state"}

`AddedTodo`, `ClearedDoneTodos`, and `SelectedFilter` are facts with names. They flow through one function, show up in [DevTools](/core/devtools), and drive [Story and Scene tests](/testing). “How can the todo list change?” is answered by reading one Message union and one update function, and `M.tagsExhaustive` makes that answer total: forget a case and the code stops compiling. That holds the same way at the hundredth Message as at the first.

## Async State

Effect Atom has a built-in model for async state. Foldkit folds remote state into the Model like any other field.

### Effect Atom: the Result type {#atom-async}

Hand an Effect to `Atom.make` (or `runtime.atom`, as in the snippet below, when the Effect needs Layer-provided services) and you get back an atom whose value is a `Result`: `Initial`, `Success`, or `Failure`, each carrying a `waiting` flag for in-flight refreshes. The Effect runs lazily, the first time a mounted component reads the atom; from there the runtime caches the Result, tracks dependencies, and re-runs on refresh. `Result.builder` renders each state.

::Snippet{name="atomCompareAtomAsync" label="Effect Atom async"}

Effect Atom handles loading, error, stale-while-revalidate, and Suspense integration for you. With `Atom.family`, `Atom.runtime` for Layer-provided services, and helpers like `AtomHttpApi` and `AtomRpc`, it is a full data-fetching layer, not just a state primitive. Foldkit draws the line in a different place, as the next section shows: it ships the value type for remote state but not the fetching runtime around it.

### Foldkit: remote state in the Model {#foldkit-async}

Foldkit has no atoms, async or otherwise. Remote state is an ordinary value in the Model, and Foldkit ships [AsyncData](/core/async-data) to model it: a six-state union that makes loading, failure, stale-while-revalidate, and keep-stale-on-failure first-class states. You fire a [Command](/core/commands) and fold its result back through update as a Message.

::Snippet{name="atomCompareFoldkitAsync" label="Foldkit async"}

AsyncData carries the loading, failure, and stale states; the fetch is a named Command you can assert on; and the transitions (`ClickedLoadUser`, `SucceededLoadUser`, `FailedLoadUser`) are the same kind of fact as every other change in the app. Effect Atom’s Result lives in the registry, reactive but off to the side. Foldkit’s remote state lives in the Model, so it time-travels, serializes, and tests like anything else. What Effect Atom bundles that Foldkit does not is the fetching runtime: automatic execution, a keyed cache, request deduplication, background refresh, and Suspense. For a dashboard of independent queries, that machinery does a lot for you out of the box. For remote state that interacts with the rest of the app, keeping it in the one Model means it shares the same timeline, tools, and tests as everything else.

## Side Effects and Lifecycle

In both, effects can be Effect values. What differs is where an effect is declared and how you find all of them.

### Effect Atom: effects live inside atoms {#atom-effect}

In Effect Atom, an effect lives inside the atom that produces it. A mutation is a function atom from `runtime.fn`, often tagged with `reactivityKeys` so that finishing it invalidates the atoms that depend on those keys. A subscription to the outside world is an atom that wires a listener in its body and tears it down with `addFinalizer`, kept alive by `useAtomMount`.

::Snippet{name="atomCompareAtomEffect" label="Effect Atom effects"}

The inventory is distributed: to list every effect the app can perform, you read every atom, because any atom may run one. And the connection between “this changed” and “that refreshed” is the `reactivityKeys` array, matched by value at runtime, not a type the compiler can check.

### Foldkit: Commands and Subscriptions {#foldkit-effect}

Foldkit splits effects by what causes them. A [Command](/core/commands) is a named Effect, returned from update as a value. A [Subscription](/core/subscriptions) binds a slice of the Model to a scoped `Stream<Message>`. The runtime runs that stream for as long as the slice holds its value and closes the scope, finalizers and all, when it changes. There is no subscribe, unsubscribe, or cleanup to write by hand.

::Snippet{name="atomCompareFoldkitEffect" label="Foldkit effects"}

The win is locational. Foldkit’s effects come from a small, fixed set of primitives, each with a declared home: a Command returned from update, a Model-gated Subscription, a per-element [Mount](/core/mount) in the view, or a longer-lived [ManagedResource](/core/managed-resources). Each is a named primitive you can enumerate, not something any atom might run. And the `mouseRelease` Subscription never goes stale, because its stream reads the current Model slice rather than a value captured once at mount.

## The View Layer Is Still React {#the-view-layer}

Here is the part Effect Atom does not change: your views are React components. Effect Atom moves state and a good deal of effect logic into atoms. The view layer stays where it found it, with the hooks rules, the render model, and the closure traps intact.

### Effect Atom plus React {#atom-view}

A list item that toggles a todo, modeled as one array atom to mirror Foldkit’s one array of todos, needs `memo` to avoid re-rendering, `useCallback` to keep its handler reference stable, and a dependency array to declare. A per-item atom would re-render each row on its own and need none of it.

::Snippet{name="atomCompareAtomView" label="Effect Atom view"}

Atom-level subscriptions mean Effect Atom often needs less memoization than a `useReducer` app. But the React machinery is still present: the rules of hooks, the dependency arrays, and the memoization you maintain by hand or delegate to React Compiler, which in turn requires every component to follow the Rules of React. The `react-hooks/exhaustive-deps` lint rule catches the common mistakes, but it is a lint rule you have to run and heed, not a property of the type system.

### Foldkit {#foldkit-view}

The same item in Foldkit is a plain function returning data. The event is a Message value, not a closure, so there is nothing to stabilize and nothing to memoize at the boundary.

::Snippet{name="atomCompareFoldkitView" label="Foldkit view"}

No `memo`, no `useCallback`, no dependency array, no hooks rules. When you need to skip work, [view memoization](/core/view-memoization) keys off the data, and because the view always receives the current Model, there is no closure to go stale.

## One Timeline vs Many Cells

Because every Foldkit state change is one Message through one function, the app has a single timeline: an ordered sequence of Messages that, replayed from the initial Model through update, reconstruct every Model the app passed through and the Commands each produced. [Foldkit DevTools](/core/devtools) replays that timeline. You scrub backward and watch the exact Model at each step, including the internals of [Foldkit UI](/ui/overview) components. This site runs on Foldkit; open its DevTools with the DEV button in the bottom-right corner to try it on the page you are reading.

Effect Atom’s state is many cells in a registry. Each cell has a current value you can inspect. What there is not is a single ordered log of named events for the whole app, because there are no named events and no single owner of order. You can see what every atom holds now. You cannot replay the app as one sequence of facts, because the facts were anonymous closures distributed across components.

## Testing

Foldkit’s update function is pure: given a Model and a Message, it returns the next Model and a list of Commands, with no DOM, no HTTP, no timers. That shape is what makes its two [testing](/testing) primitives possible.

[Story](/testing/story) tests the state machine. You send Messages straight through update, resolve Commands inline by handing back the result Message you choose, and assert on the Model. Take the user-load flow from the async section: send `ClickedLoadUser`, assert the `FetchUser` Command fired, resolve it, and check the Model landed on `Success`. A Command is a value, so the test names it without running it, and a Command left unresolved fails the test. There is nothing to mock, because there is nothing imperative to intercept. Modeling side effects as inspectable values is what makes that possible.

::Snippet{name="atomCompareFoldkitStory" label="Foldkit Story test"}

[Scene](/testing/scene) tests the same flow through the rendered view. It finds elements by accessible role, label, and text, dispatches events through the real update function, and resolves Commands inline, all synchronously and without jsdom. The view and update run through the same pipeline the runtime uses in production.

::Snippet{name="atomCompareFoldkitScene" label="Foldkit Scene test"}

With Effect Atom, the update logic lives in inline closures and atom bodies, and the view is React. You can drive an atom’s underlying Effect in isolation, but to test the behavior a user sees you render the component and interact with it through `@testing-library/react` and jsdom, the same stack a plain React app uses. Here is the same user-load flow:

::Snippet{name="atomCompareAtomTest" label="React Testing Library test"}

That is jsdom, a stubbed network boundary, and an async `findByText` that polls until the `Result` resolves and React re-renders. The two Foldkit tests above run synchronously: no DOM to boot, no polling to wait on, nothing mocked. They assert on the `FetchUser` Command as a value instead of intercepting the call behind it.

## Scaling Complexity

Both models scale, but they accumulate different things. An Effect Atom app grows a dependency graph of atoms plus a set of `reactivityKeys` that wire mutations to refreshes. Adding an atom is cheap and local, changing no existing atom, and each atom declares its own dependencies where it is defined. What no single place shows is the whole graph, and the reactivity keys that tie mutations to refreshes are matched by value at runtime, so the compiler cannot verify they line up.

A Foldkit app grows by adding Messages, Commands, and Subscriptions to structures that already exist. The hundredth Message is handled in the same update function as the first, found by the same exhaustive match, replayed in the same [DevTools](/core/devtools). Each feature adds more of the same structures, not new coordination between the ones already there. The ceiling on a single update function is real, and you split it with [Submodels](/core/submodel), each its own little Model, Message union, and update, though composing them adds wiring of its own. What you add is always more of what you already understand, indexed by types that stop compiling when you miss a case.

## AI-Assisted Development

This axis matters more every year. A coding agent is at its best when the code has one shape and the types narrow the search, and Foldkit is aggressively, unapologetically uniform. State changes are Messages, the input domain is the Message union, one-shot side effects are Commands, and state transitions live in one exhaustive function. An agent asked to add a feature reads the Message union to learn every fact the app can handle, adds a variant, and `M.tagsExhaustive` turns every place that now must handle it into a compile error. The type system hands the agent its to-do list.

An Effect Atom app gives an agent a harder map of the whole. State lives in atoms across many files, transitions are inline closures at call sites, and effects live inside atoms; each atom declares its own dependencies, but no single place shows the graph, and the `reactivityKeys` that tie mutations to refreshes are runtime values, not types the compiler can check. To change behavior safely the agent reconstructs that picture from reads scattered across the codebase.

The natural worry is familiarity: React is far more represented in the training data than Foldkit. In practice it barely shows. Foldkit is the Elm Architecture in TypeScript, so an agent knows the shape from Elm and only the syntax is new, and the view is plain typed function calls and the update is pure functions over data, so there is little to get wrong. [Skills, an MCP server, and a vendored copy of the Foldkit source](/ai/overview) carry the idioms, the source most of all. The same shape that makes the code legible to a new human teammate (one place state changes, exhaustiveness as a checklist) is what makes it legible to an agent.

## Practical Trade-offs

Architecture aside, a few practical factors weigh on the choice.

|                         | React + Effect Atom                                                  | Foldkit                                                                                                                                                  |
| ----------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ecosystem               | The entire React ecosystem: components, tooling, and the hiring pool | Young but growing; batteries-included [Foldkit UI](/ui/overview); [Mount](/core/mount) and [CustomElement](/core/custom-element) for third-party interop |
| Incremental adoption    | Add one atom to an existing React app                                | Owns the whole app, though [Embedding](/core/embedding) mounts it inside one                                                                             |
| Data fetching           | Batteries included: Result, SWR, Suspense, HTTP/RPC                  | [AsyncData](/core/async-data) for the six states; the fetch, cache, and refetch are yours to model with a Command and the Model                          |
| Fine-grained reactivity | Only the components reading a changed atom re-render                 | Top-down render with a virtual DOM diff and [view memoization](/core/view-memoization)                                                                   |
| View familiarity        | JSX and the patterns every React dev knows                           | A typed function-call DSL reminiscent of Elm                                                                                                             |

## Conclusion

Both Effect Atom and Foldkit are built on Effect, and that is where the resemblance ends. Effect Atom is a state layer for a host view framework: it distributes state across reactive cells wired into React (or Solid, or Vue), optimizing for incremental adoption, fine-grained updates, and built-in data fetching. Foldkit is a framework of its own: it centralizes state into one Model changed by one update function, optimizing for a complete index of state transitions, [a single replayable timeline](/core/devtools), [tests with nothing to mock](/testing), and a shape that humans and coding agents can hold in their heads.

These are different paradigms on a shared Effect foundation. Effect Atom keeps you in React and its ecosystem, adopts one atom at a time, and brings fine-grained updates and data fetching for free. Foldkit asks for the whole app and gives back one Model, one update, and everything that follows. Which one fits depends on what you are building.
