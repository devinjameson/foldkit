# Combobox

## Overview

A searchable select with input filtering, keyboard navigation, and anchor positioning. Unlike Listbox (which uses a button trigger), Combobox has a text input for searching. You control the filtering logic: read `model.inputValue` and pass the filtered items array. The parent owns the selection: it passes the chosen value in as `maybeSelectedValue` (multi-select passes `selectedValues`) along with `restingInputValue` (the text the input rests at when closed), and folds the `Selected` and `ClearedSelection` OutMessages into its own state (single-select stores the value, multi-select toggles the value in its array).

Embed Combobox via the [`create<Item>()` factory](/ui/selection-submodels) at module scope: `const CityCombobox = Combobox.create<City>()`. The factory binds the view, update, and imperative helpers to the same `Item` type so the selected value flows through the OutMessage, typed end-to-end. Combobox constrains `Item extends string`.

For programmatic control in update functions, use `CityCombobox.open(model)`, `CityCombobox.close(model, restingInputValue)`, and `CityCombobox.selectItem(model, item, displayText)`. Each returns `[Model, Commands, Option<OutMessage>]` directly. Single-select `close` takes the resting input text (the selected display text, or empty); `Combobox.Multi` closes with `close(model)` since the multi-select input always rests empty.

What the factory returns is typed [`Combobox.Bundle<Item>`](/ui/selection-submodels#bundle-type) (`Combobox.Multi.Bundle` for the multi-select variant), for the cases where a created bundle has to be named rather than called directly.

:::Info{label="See it in an app"}
Check out how Combobox is wired up in a [real Foldkit app](https://github.com/foldkit/foldkit/blob/main/examples/ui-showcase/src/ui/view/combobox.ts).
:::

## Examples

### Single-Select {#combobox-single-select}

Pass `itemToValue` and `itemToDisplayText` to control how items map to values and what text appears in the input on selection. Filter the `items` array yourself based on `model.inputValue`.

::Demo{name="single-select"}

::Snippet{name="uiComboboxBasic" label="combobox example"}

### Nullable {#combobox-nullable}

Pass `nullable: true` at init to allow clearing the selection by clicking the selected item again, or by emptying the input and closing. Both paths reach the parent as OutMessages (`Selected` toggles, `ClearedSelection` clears), so the parent decides what an empty selection looks like.

::Demo{name="nullable"}

### Select on Focus {#combobox-select-on-focus}

Pass `selectInputOnFocus: true` at init to highlight the input text when the combobox receives focus. Typing immediately replaces the current value, making it easy to start a new search.

::Demo{name="select-on-focus"}

### Locked Placement {#combobox-locked-placement}

Set `anchor.isPlacementLocked` to `true` when a panel should keep the side chosen when it opens, even if its size changes. Focus the input, then type `Zurich`. The tall list initially opens above the input. After filtering, the list is short enough to fit below, but it stays above until it closes.

To make the behavior reproducible at any scroll position, this demo keeps the panel inside a constrained container. In normal use, you can leave the portal enabled.

::Demo{name="locked-placement"}

### Multi-Select {#combobox-multi}

Use `Combobox.Multi` for multi-selection. The dropdown stays open on selection and items toggle on/off. The parent stores the selected values and folds each `Selected` OutMessage by toggling the value in its array.

::Demo{name="multi"}

::Snippet{name="uiComboboxMulti" label="multi-select combobox example"}

## Styling

Combobox is headless. The `itemToConfig` callback controls all item markup. Style the input, button, items container, and backdrop through their respective attribute props.

The items panel is portaled to the document body and positioned relative to the input wrapper with Floating UI. Ancestor stacking contexts and overflow clipping no longer apply, so a clipped container or a sibling overlay wrapper cannot hide the open panel. The panel still stacks at the document level: give it a z-index above elevated content like sticky headers or toasts, as the demos on this page do with `z-10`. Pass `anchor: { portal: false }` to keep the panel inside the wrapper instead.

| Attribute        | Condition                                                                                                                                                       |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data-active`    | Present on the item currently highlighted by keyboard or pointer.                                                                                               |
| `data-selected`  | Present on the selected item(s).                                                                                                                                |
| `data-disabled`  | Present on disabled items.                                                                                                                                      |
| `data-closed`    | Present during close animation when isAnimated is true.                                                                                                         |
| `data-placement` | Present on the items panel, set to the side it currently sits on: top, right, bottom, or left. Fixed to the first resolved side when isPlacementLocked is true. |

## Keyboard Interaction

Focus stays on the input while arrow keys navigate items via `aria-activedescendant`.

| Key                | Description                                                                           |
| ------------------ | ------------------------------------------------------------------------------------- |
| `Arrow Down`       | Opens the dropdown or moves to the next item.                                         |
| `Arrow Up`         | Moves to the previous item.                                                           |
| `Enter`            | Selects the active item.                                                              |
| `Escape`           | Closes the dropdown.                                                                  |
| `Type a character` | Filters the items list. You control filtering in your view by passing filtered items. |

## Accessibility

The input receives `role="combobox"` with `aria-expanded` and `aria-activedescendant`. The items container receives `role="listbox"` and each item receives `role="option"` with `aria-selected`.

The input is a form field, so give it an accessible name. For a visible label, wire a native `<label for>` that targets the input id with `Combobox.inputId(id)` rather than hardcoding the `-input` convention. The `for` association makes the input properly labeled: assistive technology announces it by the visible label text, and clicking the label focuses the input. That is why it is the recommended pattern.

Two ViewConfig fields cover the cases a `<label for>` does not. Pass `ariaLabel` when there is no visible label, or `ariaLabelledBy` when the element that names the input is not a `<label>` you can point `for` at.

## API Reference

### InitConfig {#init-config}

Configuration object passed to `Combobox.init()` or `Combobox.Multi.init()`.

| Name                 | Type      | Default | Description                                                                                                                                                                                                                                                     |
| -------------------- | --------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                 | `string`  | —       | Unique ID for the combobox instance.                                                                                                                                                                                                                            |
| `isAnimated`         | `boolean` | `false` | Enables animation coordination.                                                                                                                                                                                                                                 |
| `isModal`            | `boolean` | `false` | Locks page scroll and marks other elements inert when open.                                                                                                                                                                                                     |
| `nullable`           | `boolean` | `false` | Allows clearing the selection by clicking the selected item again, or by emptying the input and closing (which emits ClearedSelection).                                                                                                                         |
| `immediate`          | `boolean` | `false` | Emits Selected on every keyboard activation while open, so arrow keys commit as they move instead of waiting for Enter. Combining immediate with nullable is discouraged: a nullable toggle fold would deselect as the arrows pass back over the selected item. |
| `selectInputOnFocus` | `boolean` | `false` | Highlights the input text when the combobox receives focus, so typing replaces the current value.                                                                                                                                                               |

### ViewConfig {#view-config}

Configuration object passed to `CityCombobox.view`.

| Name                 | Type                                                | Default | Description                                                                                                                                                                                                                                                                                                   |
| -------------------- | --------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `model`              | `Combobox.Model`                                    | —       | The combobox state from your parent Model.                                                                                                                                                                                                                                                                    |
| `toParentMessage`    | `(childMessage: Combobox.Message) => ParentMessage` | —       | Wraps Combobox Messages in your parent Message type for Submodel delegation.                                                                                                                                                                                                                                  |
| `items`              | `ReadonlyArray<Item>`                               | —       | The filtered list of items to display. You control the filtering logic based on model.inputValue.                                                                                                                                                                                                             |
| `maybeSelectedValue` | `Option<Item>`                                      | —       | The selection the parent owns. None when nothing is selected yet. Multi-select takes selectedValues: `ReadonlyArray<Item>` instead. Drives the isSelected context and aria-selected.                                                                                                                          |
| `restingInputValue`  | `string`                                            | —       | The text the input returns to when the combobox closes: the selected display text for single-select, an empty string for multi-select.                                                                                                                                                                        |
| `itemToConfig`       | `(item, context) => ItemConfig`                     | —       | Maps each item to its className and content. The context provides isActive, isSelected, and isDisabled.                                                                                                                                                                                                       |
| `itemToValue`        | `(item: Item, index: number) => Item`               | —       | Extracts the value from an item. Required.                                                                                                                                                                                                                                                                    |
| `itemToDisplayText`  | `(item: Item, index: number) => string`             | —       | Text shown in the input when an item is selected. Required.                                                                                                                                                                                                                                                   |
| `inputAttributes`    | `ReadonlyArray<Attribute<Message>>`                 | —       | Additional attributes for the text input.                                                                                                                                                                                                                                                                     |
| `itemsAttributes`    | `ReadonlyArray<Attribute<Message>>`                 | —       | Additional attributes for the dropdown items container.                                                                                                                                                                                                                                                       |
| `backdropAttributes` | `ReadonlyArray<Attribute<Message>>`                 | —       | Additional attributes for the backdrop overlay.                                                                                                                                                                                                                                                               |
| `buttonContent`      | `Html`                                              | —       | Content for the dropdown toggle button (typically a chevron icon).                                                                                                                                                                                                                                            |
| `buttonAttributes`   | `ReadonlyArray<Attribute<Message>>`                 | —       | Additional attributes for the toggle button.                                                                                                                                                                                                                                                                  |
| `anchor`             | `AnchorConfig`                                      | —       | Floating positioning config: placement, gap, offset, padding, isPlacementLocked, and portal. The items panel is always anchored to the input wrapper; when omitted, the panel uses bottom-start placement. Portaled to the document body by default; pass portal: false to keep the panel inside the wrapper. |
| `ariaLabel`          | `string`                                            | —       | Accessible name for the input. Use when there is no visible label. Applied as aria-label, and takes precedence over ariaLabelledBy.                                                                                                                                                                           |
| `ariaLabelledBy`     | `string`                                            | —       | Id of an external element that labels the input, applied as aria-labelledby. Pair with a visible label element.                                                                                                                                                                                               |

### OutMessage {#out-message}

Messages emitted to the parent through the third element of `[Model, Commands, Option<OutMessage>]`. Pattern-match on the OutMessage in your update handler. The same shape applies to the update returned by `Combobox.Multi.create()`, as in `CitiesCombobox.update`.

| Name               | Type              | Default | Description                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------ | ----------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Selected`         | `{ value: Item }` | —       | Emitted when an item is activated. Carries the neutral fact that the item was activated; the parent owns the selection and decides what it means. Single-select stores the value; multi-select toggles the value in and out of its array. Pattern-match the third tuple element of CityCombobox.update in your GotComboboxMessage handler to fold the value into the selection you own. |
| `ClearedSelection` | `{}`              | —       | Emitted when a nullable combobox closes with an empty input, meaning the user cleared it. The parent clears the selection it owns.                                                                                                                                                                                                                                                      |
