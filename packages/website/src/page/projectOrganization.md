# Project Organization

Foldkit apps can start in a single `main.ts` and split into modules as they grow. Here’s how to organize your code as complexity increases.

## Starting Simple

The simplest Foldkit apps keep everything in `main.ts`: Model, Messages, init, update, and view. A separate `entry.ts` imports those definitions and boots the runtime with `Runtime.makeApplication` and `Runtime.run`. The split keeps `main.ts` importable from tests without booting a runtime as a side effect. A `story.test.ts` and a `scene.test.ts` sit beside it from the start. The [Counter example](/example-apps/counter) is a good reference.

This is fine for small apps. You don’t need to split `main.ts` into multiple definition files until the single file becomes hard to navigate.

## File Layout

As your app grows and you [scale with Submodels](/core/submodel), a consistent file layout helps you navigate the codebase. Each page or feature becomes a folder:

```text
src/
├── entry.ts               Runtime bootstrap
├── main.ts                App-level init
├── model.ts               App-level state
├── message.ts             App-level messages
├── command.ts             App-level Commands
├── route.ts               Route definitions
├── update.ts              App-level update
├── view.ts                App-level view
├── subscription.ts        App-level subscriptions
├── story.test.ts          Story tests for the app-level update
├── scene.test.ts          Scene tests for flows that cross pages
│
├── page/
│   ├── index.ts           Re-exports all pages
│   ├── home/
│   │   ├── index.ts       Re-exports Home module
│   │   ├── model.ts       Home state
│   │   ├── message.ts     Home events
│   │   ├── command.ts     Home Commands
│   │   ├── update.ts      Home update
│   │   ├── view.ts        Home view
│   │   ├── story.test.ts  Story tests for the Home update
│   │   └── scene.test.ts  Scene tests for the Home view
│   └── products/
│       ├── index.ts
│       ├── model.ts
│       ├── message.ts
│       ├── command.ts
│       ├── update.ts
│       ├── view.ts
│       ├── story.test.ts
│       └── scene.test.ts
│
└── domain/
    ├── index.ts           Re-exports domain modules
    ├── cart.ts            Cart type + operations
    └── item.ts            Item type + operations
```

Each page folder mirrors The Elm Architecture: Model defines state, Message defines events, update handles transitions, view renders HTML, and init sets up initial state.

Commands live beside the update function that returns them, so a page that fetches its own data owns its `command.ts` instead of reaching into an app-level one. A page that declares its own Subscriptions gets a `subscription.ts` the same way. See [Subscription Organization](/patterns/subscription-organization) for how those compose upward.

As pages grow, you can further split into subfolders. For example, the [Typing Terminal room source](https://github.com/foldkit/foldkit/tree/main/packages/typing-game/client/src/page/room) has `view/` and `update/` subfolders for its Room page.

## Where Tests Live

Both test styles colocate with the code they exercise. A page folder’s `story.test.ts` drives that page’s `update`, and its `scene.test.ts` drives that page’s `view`. Neither needs the root: `Submodel.defineView` produces a plain `(model, h) => Html` function, the same shape the root view has, so a page’s view drops into `scene` unmodified. A Submodel that declares `ViewInputs` takes a second argument, which the test supplies through `withViewInputs`. The `toParentMessage` wrap lives at the parent’s `h.submodel` call site, not in the child’s signature. The published Submodels in `packages/ui/src/` are tested exactly this way.

What decides the level is coupling, not capability. Test inside the page folder when the behavior is the page’s own: how it renders, how it responds to clicks and typing, which Commands it returns. Enter at the root when the behavior crosses a Submodel boundary, which covers how the parent folds an OutMessage, a Command the parent lifts, a route change, and view inputs the parent computes. A page-level Scene cannot observe any of those, so asserting on them there would test a path production never runs. (The OutMessage itself is assertable at the page level with `expectOutMessage`; what the parent does with it is not.)

That split is what keeps the root suite small. It holds the flows that genuinely span pages, split by flow into `checkout.scene.test.ts` and `cart.scene.test.ts`, rather than growing into one file that reruns every page’s rendering through the whole app.

When one folder holds more than one test of a kind, prefix with the subject, like `login.story.test.ts`. Pure modules in `domain/` need neither primitive; they take ordinary Vitest tests beside them.

See the [Testing](/testing) page for the full Story and Scene reference.

## Domain Modules

For business logic that spans multiple modules, create a `domain/` folder. Each file represents a domain concept with its schema and pure functions:

::Snippet{name="domainModule" label="domain module"}

This keeps related types and operations together. You can import the module and use `Cart.addItem`, `Cart.removeItem`, etc.

## Index Re-exports {#index-reexports}

Use `index.ts` files to create clean namespace imports:

::Snippet{name="indexReexports" label="index re-exports"}

Then import and use the namespace:

::Snippet{name="indexUsage" label="namespace usage"}

This pattern gives you discoverability (`Home.` shows everything available) while keeping imports clean.
