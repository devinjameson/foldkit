# Scene

## Testing Through the View

`Scene` tests features through the rendered view. Where [Story](/testing/story) sends Messages directly to update, Scene clicks buttons, types into inputs, presses keys, and asserts on the rendered VNode tree. The view function runs on every step, so if it crashes or renders the wrong thing, the test catches it.

Scene operates on the VNode tree directly. No DOM, no jsdom, no browser. Tests are pure, deterministic, and fast.

## Locators

Locators find elements the way users find them: by role, by label, by visible text. Each factory returns a `Locator` that resolves to a single match; interactions and assertions accept either a Locator or a raw CSS selector string.

::Snippet{name="sceneLocators" label="locator examples"}

| Locator                      | Finds                                                                                           | Example                                  |
| ---------------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `Scene.role(role, options?)` | Elements by ARIA role (explicit or implicit). Options narrow by accessible name and ARIA state. | `Scene.role('button', { name: 'Save' })` |
| `Scene.label(text)`          | Form controls by their aria-label or associated \<label> text.                                  | `Scene.label('Email')`                   |
| `Scene.placeholder(text)`    | Inputs by their placeholder attribute.                                                          | `Scene.placeholder('Search...')`         |
| `Scene.text(text)`           | Elements by visible text content.                                                               | `Scene.text('Welcome back')`             |
| `Scene.altText(text)`        | Images and similar elements by their alt attribute.                                             | `Scene.altText('Profile photo')`         |
| `Scene.title(text)`          | Elements by their title attribute (tooltip text).                                               | `Scene.title('Delete')`                  |
| `Scene.testId(id)`           | Elements by data-testid: the escape hatch for tests.                                            | `Scene.testId('cart-item-3')`            |
| `Scene.displayValue(value)`  | Form controls by their current value.                                                           | `Scene.displayValue('US')`               |
| `Scene.selector(css)`        | Elements by CSS selector. Use when no accessible query fits.                                    | `Scene.selector('.chart-legend')`        |

### Scene.role

`Scene.role` is the most common locator. It accepts a second argument of state options that narrow the match. All options are optional:

::Snippet{name="sceneRole" label="Scene.role examples"}

| Option     | Type                 | Matches                                                                                                                                             |
| ---------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`     | `string \| RegExp`   | Accessible name (aria-label, aria-labelledby, label[for], or text content). Strings match exactly; regular expressions match against the full name. |
| `level`    | `number`             | Heading level (for role: "heading")                                                                                                                 |
| `checked`  | `boolean \| 'mixed'` | aria-checked or the checked attribute                                                                                                               |
| `selected` | `boolean`            | aria-selected                                                                                                                                       |
| `pressed`  | `boolean \| 'mixed'` | aria-pressed                                                                                                                                        |
| `expanded` | `boolean`            | aria-expanded                                                                                                                                       |
| `disabled` | `boolean`            | aria-disabled or the disabled attribute                                                                                                             |

### Scoping

`Scene.within(parent, child)` scopes a single locator to a parent element. `Scene.inside(parent, ...steps)` scopes a whole block of steps. Every assertion or interaction inside the block resolves within the parent’s subtree. Use `within` for one-off scoped queries; use `inside` when several steps share the same scope. Nested `inside` calls compose.

::Snippet{name="sceneScoping" label="scoping examples"}

### Multi-Match

For lists and repeated elements, the `Scene.all.*` factories (`Scene.all.role`, `Scene.all.text`, `Scene.all.label`, and so on, one per single-match factory) return a `LocatorAll` that resolves to every match. Pick one with `Scene.first`, `Scene.last`, or `Scene.nth(index)`, or narrow with `Scene.filter`:

::Snippet{name="sceneMultiMatch" label="multi-match examples"}

| Filter option | Keeps matches where                                            |
| ------------- | -------------------------------------------------------------- |
| `has`         | The element contains a descendant matching the given Locator   |
| `hasNot`      | The element does not contain a descendant matching the Locator |
| `hasText`     | The element’s text content includes the given substring        |
| `hasNotText`  | The element’s text content does not include the substring      |

## Interactions

Interactions exercise the view by invoking event handlers on matched elements. Each one captures the dispatched Message, feeds it through update, and re-renders. They accept either a Locator or a CSS selector string.

::Snippet{name="sceneInteractions" label="interaction examples"}

| Step                                     | Invokes                                                                                          |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `Scene.click(target)`                    | `OnClick` (bubbles to ancestors)                                                                 |
| `Scene.doubleClick(target)`              | `OnDoubleClick` (bubbles to ancestors)                                                           |
| `Scene.pointerDown(target, options?)`    | `OnPointerDown` with optional `{ pointerType, button, screenX, screenY }` (bubbles to ancestors) |
| `Scene.pointerUp(target, options?)`      | `OnPointerUp` with optional `{ pointerType, screenX, screenY }` (bubbles to ancestors)           |
| `Scene.hover(target)`                    | `OnMouseEnter` (falls back to `OnMouseOver`)                                                     |
| `Scene.focus(target)`                    | `OnFocus`                                                                                        |
| `Scene.blur(target)`                     | `OnBlur`                                                                                         |
| `Scene.type(target, text)`               | `OnInput` with the given text                                                                    |
| `Scene.change(target, value)`            | `OnChange` with the given value, for `<select>` and similar                                      |
| `Scene.keydown(target, key, modifiers?)` | `OnKeyDown` or `OnKeyDownPreventDefault` with optional `{ shiftKey, ctrlKey, altKey, metaKey }`  |
| `Scene.submit(target)`                   | `OnSubmit`                                                                                       |

`Scene.tap(fn)` runs a function for side effects (like ad-hoc assertions on raw VNodes or accumulated Commands) without breaking the step chain.

## Assertions

`Scene.expect(locator)` creates an inline assertion step against a single element. Every matcher has a `.not` variant that inverts the assertion.

::Snippet{name="sceneAssertions" label="assertion examples"}

| Matcher                                     | Asserts that the element                                                                       |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `.toExist()`                                | Is present in the tree                                                                         |
| `.toBeAbsent()`                             | Is not present in the tree                                                                     |
| `.toBeVisible()`                            | Is not hidden via the hidden attribute, aria-hidden, display: none, or visibility: hidden      |
| `.toBeEmpty()`                              | Has no text content or child elements                                                          |
| `.toHaveText(value)`                        | Has text content equal to the given string or matching the given regex                         |
| `.toContainText(value)`                     | Has text content including the given substring or matching the regex                           |
| `.toHaveAccessibleName(name)`               | Has the given accessible name (resolves aria-labelledby, aria-label, label[for], text content) |
| `.toHaveAccessibleDescription(description)` | Has the given accessible description (resolves aria-describedby)                               |
| `.toBeDisabled()`                           | Has aria-disabled or the disabled attribute                                                    |
| `.toBeEnabled()`                            | Is not disabled                                                                                |
| `.toBeChecked()`                            | Has aria-checked="true" or the checked attribute                                               |
| `.toHaveValue(value)`                       | Has the given current form-control value                                                       |
| `.toHaveAttr(name, value)`                  | Has the given attribute set to the given value                                                 |
| `.toHaveId(id)`                             | Has the given id                                                                               |
| `.toHaveClass(name)`                        | Has the given CSS class                                                                        |
| `.toHaveStyle(name, value)`                 | Has the given inline style property                                                            |

For `LocatorAll` (from `Scene.all.*`), use `Scene.expectAll(locatorAll)` for count-based assertions:

| Matcher           | Asserts that                           |
| ----------------- | -------------------------------------- |
| `.toHaveCount(n)` | The locator matches exactly n elements |
| `.toBeEmpty()`    | The locator matches zero elements      |

## Commands

When `update` returns Commands (see [Commands](/core/commands)), Scene tracks each as pending until the test resolves it with the result Message its Effect would resolve to at runtime. `update` declares the Command, the test declares its outcome.

Command tracking has a few semantics worth knowing:

- Pending Commands accumulate in the order `update` returns them, across as many steps as the test takes.
- Resolving a Command feeds its result Message through `update`; new Commands produced by that update join the pending list.
- `Scene.Command.resolveAll` walks cascades within the batch. If resolving Command A produces Command B and B’s resolver is in the same call, B resolves without a separate step.
- Interactions throw if there are unresolved Commands when they try to dispatch a Message.
- `Scene.scene` throws at the end if any Command remains unresolved.

::Snippet{name="sceneCommandAssertions" label="command assertions example"}

| Step                                                  | Effect                                                                                                                                                                                                                                       |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Scene.Command.resolve(Def, ResultMessage)`           | Resolves the first pending Command with the given name by feeding `ResultMessage` through update. For a child Submodel Command, pass the child’s raw result Message; resolve replays the Command’s own `mapMessages` wrapping automatically. |
| `Scene.Command.resolveAll([Def, ResultMessage], ...)` | Resolves a batch of pending Commands, walking cascades. Each entry resolves exactly one matching dispatch in declaration order; compose with Array.makeBy for N identical responses.                                                         |
| `Scene.Command.expectExact(A, B)`                     | The pending Commands are exactly A and B (order-independent).                                                                                                                                                                                |
| `Scene.Command.expectHas(A)`                          | A is among the pending Commands (subset check).                                                                                                                                                                                              |
| `Scene.Command.expectNone()`                          | There are no pending Commands.                                                                                                                                                                                                               |

Prefer `Scene.Command.expectExact` as the default. It catches bugs where an interaction produces unexpected Commands. Use `Scene.Command.expectHas` when you only care about a subset of the pending Commands.

Each matcher accepts either a Command Definition (matches by name) or a Command instance (matches by name AND structural-equal args). Pass a Definition when the test only cares that the Command was dispatched; pass an instance when the args are part of what the test is verifying. `Scene.Command.expectExact(FetchWeather({ zipCode: '90210' }))` fails if the runtime dispatched `FetchWeather({ zipCode: '99999' })`, where the same call with just `FetchWeather` would pass.

## Mounts

When a rendered view contains an `OnMount` attribute (see [Mount](/core/mount)), Scene tracks the mount as pending until the test acknowledges it with the result Message its Effect would resolve to at runtime. The mechanic mirrors Command resolution: the view declares the Mount, the test declares its outcome.

Many UI components in `@foldkit/ui` declare mounts internally (popovers positioning their panels, modal components portaling backdrops to the body, components that hand the live element to a third-party library). When the test renders any of these, the same `OnMount` shows up in the VNode tree, and Scene treats it as a pending mount. Acknowledging it advances the test through the same path the user takes: the view renders, the mount fires, the result Message updates the Model.

Mount tracking has a few semantics worth knowing:

- Pending mounts persist across re-renders. Resolving a mount does not re-pend it on the next render.
- Every mount that fires and unmounts during a scene must be acknowledged with `Scene.Mount.expectEnded`, even if it was already resolved. `resolve` handles a mount’s result Message; `expectEnded` handles its unmount. Unacknowledged unmounts throw at the end of the scene.
- Same-named mounts in the tree are disambiguated by occurrence. `Scene.Mount.resolve` resolves the first pending occurrence; a second call resolves the next.
- Interactions throw if there are unresolved mounts or unacknowledged unmounts when they try to dispatch a Message. Same contract as Commands.
- `Scene.scene` throws at the end if any mount remains unresolved.

::Snippet{name="sceneMountAssertions" label="mount assertions example"}

| Step                                                | Effect                                                                                                                                                                                                                            |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Scene.Mount.resolve(Def, ResultMessage)`           | Resolves the first pending mount with the given name by feeding `ResultMessage` through update. For a mount inside a child Submodel, resolve replays the boundary lift automatically, so you pass the child’s raw result Message. |
| `Scene.Mount.resolveAll([Def, ResultMessage], ...)` | Resolves a batch of pending mounts in order.                                                                                                                                                                                      |
| `Scene.Mount.expectExact(A, B)`                     | The pending mounts are exactly A and B (order-independent, by name).                                                                                                                                                              |
| `Scene.Mount.expectHas(A)`                          | A is among the pending mounts (subset check).                                                                                                                                                                                     |
| `Scene.Mount.expectNone()`                          | There are no pending mounts.                                                                                                                                                                                                      |
| `Scene.Mount.expectEnded(A)`                        | A has disappeared from the rendered tree. Required for every Mount that fires and then unmounts during the scene, regardless of whether it was resolved first; otherwise the scene throws at the end.                             |

UI components export their Mount definitions (`Popover.AnchorPopover`, `Listbox.AnchorListbox`, and so on) so consumer tests can name them in `Scene.Mount.resolve`.

## A Complete Scene

Here’s a Scene test for a weather app. The user types a zip code, clicks Get Weather, sees a loading state, and then the forecast appears:

::Snippet{name="sceneWeatherFlow" label="Scene weather example"}

Every interaction targets an element the way a user would: by label, by role, by placeholder. Every assertion reads like a sentence. Commands are resolved inline, just like in Story.

## Story vs Scene

Story and Scene are complementary. Story tests the state machine: does this sequence of Messages produce the right Model? Scene tests the contract: does this feature work from the user’s perspective?

Use Story for update logic, edge cases, and Command wiring. Use Scene for user flows, view rendering, and accessibility. A well-tested app uses both.
