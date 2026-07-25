# Model

## Overview

The Model represents your entire application state in a single, immutable data structure defined with [Effect Schema](https://effect.website/docs/schema/introduction/). Everything your app can be at any moment lives here, not scattered across components, not split between local and global state.

In the [restaurant analogy](/core/architecture#the-restaurant-analogy), the Model is the waiter’s notebook: the running picture of everything happening right now. Orders in flight, tables seated, who’s waiting for dessert. Every fact about the current state of the restaurant lives in one place.

In the counter example, the Model is a Struct with a single field:

::Snippet{name="counterModel" label="model example"}

TypeScript types disappear when your code compiles. They help the compiler check your code, but they don’t exist at runtime. Schema keeps that type information alive as a value. This gives Foldkit knowledge of your Model at runtime: it can compare models for equality, decode state from unknown sources, and manage resource lifecycles, things that need the Model’s shape as a value, not just a compile-time annotation. You’ll see these capabilities pay off as the counter grows, especially on the Subscriptions page.

The counter starts with a single field, but Models grow with your app. When we add auto-counting later, the Model will expand:

::Snippet{name="counterModelPreview" label="expanded model example"}

:::Info{label="One state tree, not many"}
Think of the Model as combining useState, useContext, and your Redux store into one typed structure. Instead of state scattered across components, everything lives here.
:::

The Model captures what your app is at any moment. But how does it change? In Foldkit, every change starts with a [Message](/core/messages): a fact about something that happened.
