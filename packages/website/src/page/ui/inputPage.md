# Input

## Overview

An accessible text input that links a label and description to the input element via ARIA attributes. Input is a stateless render helper: call it directly with a ViewConfig in your own view; no Model, update, or `h.submodel` wrapping. It provides three attribute groups (`input`, `label`, and `description`) that you spread onto your own elements to get correct accessibility wiring.

:::Info{label="See it in an app"}
Check out how Input is wired up in a [real Foldkit app](https://github.com/foldkit/foldkit/blob/main/examples/ui-showcase/src/ui/view/input.ts).
:::

## Examples

### Basic

Pass an `id`, an `onInput` handler, and a `toView` callback. The callback receives attribute groups for three elements: `label` (linked via `for`), `input` (with ARIA attributes), and `description` (linked via `aria-describedby`).

::Demo{name="basic"}

::Snippet{name="uiInputBasic" label="basic input example"}

### Disabled

Set `isDisabled: true` to disable the input. Unlike Button, Input uses the native `disabled` attribute in addition to `aria-disabled`, so the browser prevents interaction entirely.

::Demo{name="disabled"}

::Snippet{name="uiInputDisabled" label="disabled input example"}

## Styling

Input is headless. Your `toView` callback controls all markup and styling. Use the data attributes below to style different states. For validation, set `isInvalid: true` and style with `data-[invalid]` in your CSS.

| Attribute       | Condition                        |
| --------------- | -------------------------------- |
| `data-disabled` | Present when isDisabled is true. |
| `data-invalid`  | Present when isInvalid is true.  |

## Keyboard Interaction

Input uses the native `<input>` element, so all keyboard interaction is handled by the browser.

| Key   | Description                            |
| ----- | -------------------------------------- |
| `Tab` | Moves focus to or away from the input. |

## Accessibility

The three attribute groups wire up ARIA relationships automatically. The `label` group includes `for` pointing to the input `id`. The `description` group includes an `id` that the input references via `aria-describedby`. You can access this description ID directly with `Input.descriptionId(id)` if you need to reference it outside the `toView` callback.

When `isInvalid` is true, `aria-invalid="true"` is set on the input element so screen readers announce the error state.

## API Reference

### ViewConfig {#view-config}

Configuration object passed to `Input.view()`.

| Name          | Type                                        | Default  | Description                                                                                                         |
| ------------- | ------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------- |
| `id`          | `string`                                    | —        | Unique ID for the input element. Used to link the label and description via ARIA attributes.                        |
| `toView`      | `(attributes: InputAttributes) => Html`     | —        | Callback that receives attribute groups for the input, label, and description elements.                             |
| `onInput`     | `((value: string) => Message) \| undefined` | —        | Optional function that maps the current input value to a Message on each input event. Omit for a read-only display. |
| `value`       | `string`                                    | —        | The current value of the input.                                                                                     |
| `isDisabled`  | `boolean`                                   | `false`  | Whether the input is disabled. Sets both the native disabled attribute and aria-disabled.                           |
| `isInvalid`   | `boolean`                                   | `false`  | Whether the input is in an invalid state. Sets aria-invalid and adds a data-invalid attribute for styling.          |
| `isAutofocus` | `boolean`                                   | `false`  | Whether the input receives focus when the page loads.                                                               |
| `name`        | `string`                                    | —        | The form field name for native form submission.                                                                     |
| `type`        | `string`                                    | `'text'` | The HTML input type (text, email, password, number, etc.).                                                          |
| `placeholder` | `string`                                    | —        | Placeholder text shown when the input is empty.                                                                     |

### InputAttributes {#input-attributes}

Attribute groups provided to the `toView` callback.

| Name          | Type                                | Default | Description                                                                                       |
| ------------- | ----------------------------------- | ------- | ------------------------------------------------------------------------------------------------- |
| `input`       | `ReadonlyArray<Attribute<Message>>` | —       | Spread onto the `<input>` element. Includes id, type, value, ARIA attributes, and event handlers. |
| `label`       | `ReadonlyArray<Attribute<Message>>` | —       | Spread onto the `<label>` element. Includes a for attribute linking to the input id.              |
| `description` | `ReadonlyArray<Attribute<Message>>` | —       | Spread onto a description element. Includes an id that the input references via aria-describedby. |
