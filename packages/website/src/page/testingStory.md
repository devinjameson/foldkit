# Story

## Testing the Update Loop

The Elm Architecture makes testing straightforward. The update function is pure. Given a Model and a Message, it always returns the same result. No DOM, no HTTP calls, no timers. Just a function that takes data and returns data.

`Story` tests the state machine. You send Messages through update, resolve Commands inline, and assert on the Model. The entire test is one `story` call. No mocking libraries, no fake timers, no setup or teardown.

## The API

Import the steps you need from `foldkit/story`. The top-level steps are `story`, `given`, `message`, `model`, `expectOutMessage`, and `expectNoOutMessage`. Command resolution and assertions live under the `Command` namespace: `Command.resolve`, `Command.resolveAll`, `Command.resolveAllExact`, `Command.expectHas`, `Command.expectExact`, and `Command.expectNone`.

A test file usually needs only one of the two testing modules, so named imports keep the call sites short. When a single file tests both a story and a scene, import the namespaces instead (`import { Scene, Story } from 'foldkit'`) so `Story.given` and `Scene.given` stay distinguishable.

::Snippet{name="testingApi" label="API reference"}

Command matchers (`expectHas`, `expectExact`, and `resolve`) accept either a Command Definition (matches by name) or a Command instance (matches by name AND structural-equal args). Pass a Definition when the test only cares that the Command was dispatched. Pass an instance like `FetchWeather({ zipCode: '90210' })` when the args are part of what the test is verifying. Strict matching catches regressions where a Command fires with wrong inputs, which a name-only match would silently pass.

:::Info{label="Mount lifecycle is a Scene concern"}
Story does not render the view, so the OnMount lifecycle is not observable from a Story test. Tests that need to acknowledge mounts use Scene's `Mount.resolve` and the related steps; see the [Scene](/testing/scene) page.
:::

## Your First Test

Here’s a test for the delayed reset from the [Commands](/core/commands) page. When the user clicks reset, a one-second delay fires, then the count resets to zero:

::Snippet{name="counterCommandsTest" label="simple test example"}

The test reads as a story. Start from a Model with count 5. Send `ClickedResetAfterDelay()`. Verify that update returned a `DelayReset` Command. Resolve it with `CompletedDelayReset()`. Verify the count is 0. Every step is visible. The simulation called update, resolved the Command with the Message you provided, fed that Message back through update, and arrived at the final state.

## Multi-Step Flows

Real apps have multi-step user stories. `Command.resolve`, `Command.resolveAll`, and `Command.resolveAllExact` let you resolve Commands inline at any point in the story. This keeps the resolution next to the step that produced the Command, so the test reads chronologically:

::Snippet{name="testingWeatherFlow" label="multi-step test example"}

Every `message` is a user action: “the user submitted the form.” Every Command resolver is world-building: “the weather API succeeded.” Every `model` is a scene check: “the weather is showing.”

:::Info{label="Resolvers are a queue"}
Each entry in `resolveAll` resolves exactly one matching dispatch in declaration order. `[FetchCount, m1], [FetchCount, m2], [FetchCount, m3]` reads as three responses to three dispatches. For N identical responses, compose with `Array.makeBy(n, () => [Def, message])`. Resolvers carry across calls: unused entries can match later dispatches, and a new entry replaces any leftover resolvers sharing its Definition or Instance shape (latest wins).
:::

:::Info{label="Exact resolution"}
Use `resolveAllExact` when the resolver list is also a claim about which Commands were dispatched. It walks cascades like `resolveAll`, but every listed entry must match one dispatch within that call and no actual Command may remain unresolved. Repeated entries sharing a Definition consume repeated dispatches in declaration order. Supplied resolvers never carry forward.
:::

:::Info{label="Unresolved Commands"}
`message` throws if there are pending Commands from a previous step. Resolve all Commands before sending the next Message. `story` throws at the end if any Commands remain unresolved. Every Command your update function produces must be accounted for.
:::

## Testing Side Effects

The simulation tests the state machine. Messages go in, Model changes come out, Commands are resolved declaratively. It does not run the actual Effects inside Commands.

To test that a Command’s Effect works correctly (for example, that an HTTP request parses the response right), test it separately with `Effect.provide` and a mock service layer:

::Snippet{name="testingCommandEffect" label="Command Effect test example"}

Two levels, clean separation. The simulation proves the state machine wires correctly. `Effect.provide` proves the side effect works. If the state machine sends the right Command, and the Command does the right thing, the program works.
