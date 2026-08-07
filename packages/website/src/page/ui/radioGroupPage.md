# Radio Group

## Overview

A single-selection component with roving tabindex keyboard navigation. Arrow keys simultaneously move focus and select the option. There is no separate focus-then-select step. RadioGroup is a stateless controlled render helper: call it directly with a ViewConfig in your own view; no Model, update, or `h.submodel` wrapping. Your Model owns the selected value, you pass it in as `selectedValue`, and `onSelect` dispatches a parent Message when the user commits an option. Both vertical and horizontal orientation are supported.

:::Info{label="See it in an app"}
Check out how RadioGroup is wired up in a [real Foldkit app](https://github.com/foldkit/foldkit/blob/main/examples/ui-showcase/src/ui/view/radioGroup.ts).
:::

## Examples

### Vertical

Call `RadioGroup.view(config, h)` directly in your view. Read the current selection from your Model into `selectedValue`, pass the typed `options` array, and provide an `onSelect` handler that maps the committed value to a parent Message. The `toView` callback receives one `OptionInfo<Value>` per option (with attribute bundles for the option, label, and description).

In your update handler for that Message, just store the value. Moving focus onto the selected option (the roving-tabindex behavior) is handled inside the radio group’s own click and keydown handlers, so it never becomes your update’s concern.

::Demo{name="vertical"}

::Snippet{name="uiRadioGroupBasic" label="radio group example"}

### Horizontal

Pass `orientation: 'Horizontal'` in the ViewConfig to switch to left/right arrow navigation.

::Demo{name="horizontal"}

## Styling

RadioGroup is headless. The `toView` callback owns all option markup and styling, spreading the attribute bundles from each `OptionInfo` onto the consumer's elements. Use the data attributes below to style selected, focused, and disabled states.

| Attribute       | Condition                                               |
| --------------- | ------------------------------------------------------- |
| `data-checked`  | Present on the selected option.                         |
| `data-active`   | Present on the option that has focus (roving tabindex). |
| `data-disabled` | Present on disabled options.                            |

## Keyboard Interaction

RadioGroup uses roving tabindex: only the active option is in the tab order. Arrow keys move focus and select simultaneously. Disabled options are skipped during keyboard navigation.

| Key                  | Description                                        |
| -------------------- | -------------------------------------------------- |
| `Arrow Down / Right` | Move focus and select the next option (wraps).     |
| `Arrow Up / Left`    | Move focus and select the previous option (wraps). |
| `Home`               | Move focus and select the first option.            |
| `End`                | Move focus and select the last option.             |
| `Space`              | Select the focused option.                         |

## Accessibility

The group element receives `role="radiogroup"` and `aria-orientation`. Each option receives `role="radio"` with `aria-checked`, `aria-labelledby`, and `aria-describedby`.

## API Reference

### ViewConfig {#view-config}

Configuration object passed to `RadioGroup.view()`.

| Name               | Type                                       | Default      | Description                                                                                                                                                                                                                               |
| ------------------ | ------------------------------------------ | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`               | `string`                                   | —            | Unique ID for the radio group instance. Used to link ARIA attributes and to target focus.                                                                                                                                                 |
| `selectedValue`    | `Option<Value>`                            | —            | The currently-selected value, read from your Model. `Option.none()` renders with nothing selected.                                                                                                                                        |
| `options`          | `ReadonlyArray<Value>`                     | —            | The list of option values, in display order. `Value` is inferred from this array, so each `OptionInfo.value` is typed as your union.                                                                                                      |
| `ariaLabel`        | `string`                                   | —            | Accessible label for the radio group.                                                                                                                                                                                                     |
| `onSelect`         | `(value: Value) => Message`                | —            | Maps a committed option to a Message in your parent Message type. Your update handler just stores the value. Moving focus onto the newly-selected option is the radio group’s own concern, handled inside its click and keydown handlers. |
| `orientation`      | `'Vertical' \| 'Horizontal'`               | `'Vertical'` | Layout orientation. Controls arrow key direction and `aria-orientation`.                                                                                                                                                                  |
| `toView`           | `(render: RenderInfo<Value>) => Html`      | —            | Callback that receives the `group` attribute bundle, one `OptionInfo<Value>` per option, the current `selectedValue`, and the `hiddenInput` attributes. Returns the composed layout.                                                      |
| `isOptionDisabled` | `(value: Value, index: number) => boolean` | —            | Disables individual options.                                                                                                                                                                                                              |
| `isDisabled`       | `boolean`                                  | `false`      | Disables all options.                                                                                                                                                                                                                     |
| `name`             | `string`                                   | —            | Form field name. When provided, `RenderInfo.hiddenInput` carries the attributes for a hidden `<input>` holding the selected value (the consumer renders the element).                                                                     |

### RenderInfo {#render-info}

Payload delivered to the `toView` callback each render.

| Name            | Type                                | Default | Description                                                                                                                                                                |
| --------------- | ----------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `group`         | `ReadonlyArray<Attribute<Message>>` | —       | Spread onto the radio group container. Includes `role="radiogroup"`, `aria-orientation`, and `aria-label`.                                                                 |
| `options`       | `ReadonlyArray<OptionInfo<Value>>`  | —       | One entry per option in `options`, in the same order. See OptionInfo below.                                                                                                |
| `selectedValue` | `Option<Value>`                     | —       | The currently-selected value, if any. Convenient when rendering selected-state visuals next to the option attributes.                                                      |
| `hiddenInput`   | `ReadonlyArray<Attribute<Message>>` | —       | When `name` is supplied, attributes for a hidden form input carrying the selected value. The consumer renders the `<input>` element. Empty array when `name` is undefined. |

### OptionInfo {#option-info}

Each entry in `RenderInfo.options`. Carries the value, derived state flags, and attribute bundles for the option element, its label, and its description.

| Name          | Type                                | Default | Description                                                                                                                                                                                                             |
| ------------- | ----------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `value`       | `Value`                             | —       | The option value, typed as the union inferred from `options`.                                                                                                                                                           |
| `index`       | `number`                            | —       | Position in the `options` array.                                                                                                                                                                                        |
| `isSelected`  | `boolean`                           | —       | Whether this option is currently selected.                                                                                                                                                                              |
| `isActive`    | `boolean`                           | —       | Whether this option owns the roving tabindex (the one in the tab order).                                                                                                                                                |
| `isDisabled`  | `boolean`                           | —       | Whether this option is disabled (either individually via `isOptionDisabled` or because `isDisabled` is set on the whole group).                                                                                         |
| `option`      | `ReadonlyArray<Attribute<Message>>` | —       | Spread onto the option element. Includes `role="radio"`, `aria-checked`, `aria-labelledby`, `aria-describedby`, `tabindex`, click/keyboard handlers, and `type="button"` so an option inside a form does not submit it. |
| `label`       | `ReadonlyArray<Attribute<Message>>` | —       | Spread onto the label element. Includes an id for `aria-labelledby`.                                                                                                                                                    |
| `description` | `ReadonlyArray<Attribute<Message>>` | —       | Spread onto a description element. Includes an id for `aria-describedby`.                                                                                                                                               |
