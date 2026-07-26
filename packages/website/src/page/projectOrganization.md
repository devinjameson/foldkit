# Project Organization

Foldkit apps can start in a single `main.ts` and split into modules as they grow. Here’s how to organize your code as complexity increases.

## Starting Simple

The simplest Foldkit apps keep everything in `main.ts`: Model, Messages, init, update, and view. A separate `entry.ts` imports those definitions and boots the runtime with `Runtime.makeApplication` and `Runtime.run`. The split keeps `main.ts` importable from tests without booting a runtime as a side effect. The [Counter example](/example-apps/counter) is a good reference.

This is fine for small apps. You don’t need to split `main.ts` into multiple definition files until the single file becomes hard to navigate.

## File Layout

As your app grows and you [scale with Submodels](/core/submodel), a consistent file layout helps you navigate the codebase. Each page or feature becomes a folder:

```text
src/
├── entry.ts             Runtime bootstrap
├── main.ts              App-level init
├── model.ts             App-level state
├── message.ts           App-level messages
├── route.ts             Route definitions
├── update.ts            App-level update
├── view.ts              App-level view
├── story.test.ts        Story tests (drive update)
├── scene.test.ts        Scene tests (drive the rendered view, from the root)
│
├── page/
│   ├── index.ts         Re-exports all pages
│   ├── home/
│   │   ├── index.ts     Re-exports Home module
│   │   ├── model.ts     Home state
│   │   ├── message.ts   Home events
│   │   ├── update.ts    Home update
│   │   └── view.ts      Home view
│   └── products/
│       ├── index.ts
│       ├── model.ts
│       ├── message.ts
│       ├── update.ts
│       └── view.ts
│
└── domain/
    ├── index.ts         Re-exports domain modules
    ├── cart.ts          Cart type + operations
    └── item.ts          Item type + operations
```

Each page folder mirrors The Elm Architecture: Model defines state, Message defines events, update handles transitions, view renders HTML, and init sets up initial state.

As pages grow, you can further split into subfolders. For example, the [Typing Terminal room source](https://github.com/foldkit/foldkit/tree/main/packages/typing-game/client/src/page/room) has `view/` and `update/` subfolders for its Room page.

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
