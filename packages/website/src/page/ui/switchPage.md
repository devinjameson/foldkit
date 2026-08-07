# Switch

## Overview

An on/off toggle. Semantically different from Checkbox: Switch represents an immediate action (like a light switch), while Checkbox represents a form value that gets submitted. Switch is a stateless controlled render helper with the same wiring as Checkbox: your Model owns the on/off value, you pass it in as `isChecked`, and `onToggle` dispatches a Message when the user toggles it. In your update handler, just store the value.

:::Info{label="See it in an app"}
Check out how Switch is wired up in a [real Foldkit app](https://github.com/foldkit/foldkit/blob/main/examples/ui-showcase/src/ui/view/switch.ts).
:::

## Examples

The switch renders as a `<button>` with `role="switch"`. The typical visual is a track with a sliding knob, styled with the `data-checked` attribute for the on state.

::Demo{name="basic"}

::Snippet{name="uiSwitchBasic" label="switch example"}

## Styling

Switch is headless. Your `toView` callback controls all markup and styling. Use `data-[checked]` to change the track color and translate the knob.

| Attribute       | Condition                        |
| --------------- | -------------------------------- |
| `data-checked`  | Present when the switch is on.   |
| `data-disabled` | Present when isDisabled is true. |

## Keyboard Interaction

| Key     | Description         |
| ------- | ------------------- |
| `Space` | Toggles the switch. |

## Accessibility

The switch button receives `role="switch"` and `aria-checked`. The label is linked via `aria-labelledby` and the description via `aria-describedby`. Clicking the label toggles the switch.

The `label` attribute group includes an id (accessible via `Switch.labelId(id)`) and the `description` group includes an id (accessible via `Switch.descriptionId(id)`), so a consumer can reference either element without re-declaring the naming convention.

## API Reference

### ViewConfig {#view-config}

Configuration object passed to `Switch.view()`.

| Name         | Type                                     | Default | Description                                                                                                         |
| ------------ | ---------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------- |
| `id`         | `string`                                 | —       | Unique ID for the switch instance. Used to link the label and description via ARIA.                                 |
| `isChecked`  | `boolean`                                | —       | The current on/off state, read from your Model. `aria-checked` and the `data-checked` marker derive from it.        |
| `onToggle`   | `(isChecked: boolean) => Message`        | —       | Maps the new on/off state to a Message when the user toggles the switch. Your update handler just stores the value. |
| `toView`     | `(attributes: SwitchAttributes) => Html` | —       | Callback that receives attribute groups for the button, label, description, and hidden input elements.              |
| `isDisabled` | `boolean`                                | `false` | Whether the switch is disabled.                                                                                     |
| `name`       | `string`                                 | —       | Form field name. When provided, a hidden input is included for native form submission.                              |
| `value`      | `string`                                 | `'on'`  | Value sent in the form when checked.                                                                                |

### SwitchAttributes {#switch-attributes}

Attribute groups provided to the `toView` callback.

| Name          | Type                                | Default | Description                                                                                                    |
| ------------- | ----------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------- |
| `button`      | `ReadonlyArray<Attribute<Message>>` | —       | Spread onto the switch button element. Includes role, aria-checked, tabindex, and click/keyboard handlers.     |
| `label`       | `ReadonlyArray<Attribute<Message>>` | —       | Spread onto the label element. Includes an id for aria-labelledby and a click handler that toggles the switch. |
| `description` | `ReadonlyArray<Attribute<Message>>` | —       | Spread onto a description element. Includes an id referenced by aria-describedby on the switch.                |
| `hiddenInput` | `ReadonlyArray<Attribute<Message>>` | —       | Spread onto a hidden `<input>` for form submission. Only needed when the name prop is set.                     |
