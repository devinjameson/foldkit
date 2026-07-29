# Checkbox

## Overview

A toggle with checked, unchecked, and indeterminate states. Checkbox is a stateless controlled render helper: call it directly with a ViewConfig in your own view; no Model, update, or `h.submodel` wrapping. Your Model owns the checked value, you pass it in as `isChecked`, and `onToggle` dispatches a Message when the user toggles it. In your update handler, just store the value. For an on/off toggle that represents an immediate action (like a light switch), use Switch instead.

:::Info{label="See it in an app"}
Check out how Checkbox is wired up in a [real Foldkit app](https://github.com/foldkit/foldkit/blob/main/examples/ui-showcase/src/ui/view/checkbox.ts).
:::

## Examples

### Basic

The checkbox element is typically a `<button>`. Spread `attributes.checkbox` onto it for role, ARIA state, and keyboard/click handlers. The label click handler also toggles the checkbox.

::Demo{name="basic"}

::Snippet{name="uiCheckboxBasic" label="basic checkbox example"}

### Indeterminate

Pass `isIndeterminate: true` to show a mixed state. This is typically computed from child checkbox states: when some but not all children are checked, the parent shows the indeterminate mark. Toggling the parent sets all children to the same state.

::Demo{name="indeterminate"}

::Snippet{name="uiCheckboxIndeterminate" label="indeterminate checkbox example"}

## Styling

Checkbox is headless. Your `toView` callback controls all markup and styling. Use the data attributes below to style checked, indeterminate, and disabled states.

| Attribute            | Condition                                   |
| -------------------- | ------------------------------------------- |
| `data-checked`       | Present when checked and not indeterminate. |
| `data-indeterminate` | Present when isIndeterminate is true.       |
| `data-disabled`      | Present when isDisabled is true.            |

## Keyboard Interaction

| Key     | Description           |
| ------- | --------------------- |
| `Space` | Toggles the checkbox. |

## Accessibility

The checkbox element receives `role="checkbox"` and `aria-checked` which is set to `"true"`, `"false"`, or `"mixed"` depending on the checked and indeterminate state. The label is linked via `aria-labelledby` and the description via `aria-describedby`.

## API Reference

### ViewConfig {#view-config}

Configuration object passed to `Checkbox.view()`.

| Name              | Type                                       | Default | Description                                                                                                                      |
| ----------------- | ------------------------------------------ | ------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `id`              | `string`                                   | —       | Unique ID for the checkbox instance. Used to link the label and description via ARIA.                                            |
| `isChecked`       | `boolean`                                  | —       | The current checked state, read from your Model. `aria-checked` and the `data-checked` marker derive from it.                    |
| `onToggle`        | `(isChecked: boolean) => Message`          | —       | Maps the new checked state to a Message when the user toggles the checkbox. Your update handler just stores the value.           |
| `toView`          | `(attributes: CheckboxAttributes) => Html` | —       | Callback that receives attribute groups for the checkbox, label, description, and hidden input elements.                         |
| `isDisabled`      | `boolean`                                  | `false` | Whether the checkbox is disabled.                                                                                                |
| `isIndeterminate` | `boolean`                                  | `false` | Whether to show the indeterminate (mixed) state. Useful for "select all" checkboxes where some but not all children are checked. |
| `name`            | `string`                                   | —       | Form field name. When provided, a hidden input is included for native form submission.                                           |
| `value`           | `string`                                   | `'on'`  | Value sent in the form when checked.                                                                                             |

### CheckboxAttributes {#checkbox-attributes}

Attribute groups provided to the `toView` callback.

| Name          | Type                                | Default | Description                                                                                                                    |
| ------------- | ----------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `checkbox`    | `ReadonlyArray<Attribute<Message>>` | —       | Spread onto the checkbox element (typically a `<button>`). Includes role, aria-checked, tabindex, and click/keyboard handlers. |
| `label`       | `ReadonlyArray<Attribute<Message>>` | —       | Spread onto the label element. Includes an id for aria-labelledby and a click handler that toggles the checkbox.               |
| `description` | `ReadonlyArray<Attribute<Message>>` | —       | Spread onto a description element. Includes an id referenced by aria-describedby on the checkbox.                              |
| `hiddenInput` | `ReadonlyArray<Attribute<Message>>` | —       | Spread onto a hidden `<input>` for form submission. Only needed when the name prop is set.                                     |
