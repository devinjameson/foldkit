# Testing

## Overview

The Elm Architecture makes testing straightforward. The update function is pure. Given a Model and a Message, it always returns the same result. No DOM, no HTTP calls, no timers. Just a function that takes data and returns data.

Foldkit ships two testing primitives. `Story` tests the state machine: you send Messages directly through update, resolve Commands inline, and assert on the Model. `Scene` tests features through the rendered view (for example clicking buttons, typing into inputs, or pressing keys) using accessible locators. Both are pure, deterministic, and fast.

Use Story for update logic, edge cases, and Command wiring. Use Scene for user flows, view rendering, and accessibility. A well-tested Foldkit app uses both.

Name test files for their test style, beside the code under test: `story.test.ts` for Story tests (which drive `update`) and `scene.test.ts` for Scene tests (which drive the rendered view). The name describes how the test works, not a source file, so it stays correct whether `update` and `view` live in `main.ts` or in their own files. When one folder holds more than one test of a kind (sibling pages, component variants), prefix with the subject, like `login.story.test.ts`. Because a Scene always runs from the root `update` and `view`, one root-level `scene.test.ts` covers the whole app. A large suite can split by flow into `checkout.scene.test.ts`, `cart.scene.test.ts`, and so on, each still entering through the root view rather than testing a sub-view in isolation.

## Story

`Story.story` simulates the update loop. Each step reads like a sentence: send a Message, resolve a Command, check the Model. See the [Story](/testing/story) page for the full API.

Story tests are flexible about testing level. Because Story sends Messages directly to `update` and asserts on the Model, testing a child’s update in isolation is valid: the function signature is the contract, and it works the same whether the parent calls it or the test does.

::Snippet{name="counterCommandsTest" label="Story example"}

## Scene

`Scene.scene` exercises the view. Locators find elements the way users do: by role, label, or placeholder. Interactions dispatch Messages through the rendered event handlers. Inline assertions check the HTML between steps. Scene also tracks the Mount lifecycle: the side effects declared by `OnMount` attributes in the view must be acknowledged via `Scene.Mount.resolve`, mirroring how Commands are resolved. See the [Scene](/testing/scene) page for the full API.

Scene tests should always run from the root `update` and `view`. In a [Submodel](/core/submodel) app, only the root view has the `(model) => Html` signature that `Scene.scene` expects. Every level below takes a `toParentMessage` adapter. Testing a child view in isolation means inventing a code path that never runs in production: the parent’s Command mapping, OutMessage handling, and Model transitions would all be invisible. Test what users see, through the same code path they use.

::Snippet{name="sceneWeatherFlow" label="Scene example"}
