# Slider

## Overview

A numeric range input for values that sit on a continuous or stepped scale. Common uses include rating scales, volume controls, filter thresholds, and brightness settings. Follows the WAI-ARIA slider pattern with `role="slider"`, full keyboard navigation, and pointer drag.

:::Info{label="See it in an app"}
Check out how Slider is wired up in a [real Foldkit app](https://github.com/foldkit/foldkit/blob/main/examples/ui-showcase/src/ui/view/slider.ts).
:::

## Examples

Slider is headless. Your `toView` callback controls all markup and styling. The component hands back attribute groups for the root, track, filled track, thumb, label, and an optional hidden input for form submission.

::Demo{name="slider"}

::Snippet{name="uiSliderBasic" label="slider example"}

## Subscriptions

Pointer drag needs document-level `pointermove` / `pointerup` tracking (the cursor can leave the slider element). Slider exposes this as a Subscription you wire into your app’s `subscriptions` alongside an Escape-key Subscription that cancels an in-progress drag. The example snippet above shows the full wiring.

## Styling

Slider exposes `data-dragging` while the user is actively dragging, `data-disabled` when disabled, and `data-orientation` on the root. The `filledTrack` attribute group carries an inline width so the filled portion always matches the current value.

| Attribute          | Condition                                                                                |
| ------------------ | ---------------------------------------------------------------------------------------- |
| `data-dragging`    | Present on the root, track, filled track, and thumb while the user is actively dragging. |
| `data-disabled`    | Present on all groups when isDisabled is true.                                           |
| `data-orientation` | Present on the root. Always "horizontal" in v1; vertical is planned.                     |

## Keyboard Interaction

| Key                     | Description                                                              |
| ----------------------- | ------------------------------------------------------------------------ |
| `ArrowRight / ArrowUp`  | Increases the value by one step.                                         |
| `ArrowLeft / ArrowDown` | Decreases the value by one step.                                         |
| `PageUp`                | Increases the value by ten steps.                                        |
| `PageDown`              | Decreases the value by ten steps.                                        |
| `Home`                  | Jumps to the minimum value.                                              |
| `End`                   | Jumps to the maximum value.                                              |
| `Escape`                | During a pointer drag, cancels the drag and restores the pre-drag value. |

## Accessibility

The thumb receives `role="slider"`, `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, and `aria-orientation`. When `formatValue` is provided, the formatted string is announced via `aria-valuetext`. By default the thumb is labeled via `aria-labelledby` pointing at the id carried on the `label` attribute group; you can override this with an explicit `ariaLabel` or `ariaLabelledBy`.

## API Reference

### InitConfig {#init-config}

Configuration object passed to `Slider.init()`.

| Name   | Type     | Default | Description                                                                                                                   |
| ------ | -------- | ------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `id`   | `string` | —       | Unique ID for the slider instance.                                                                                            |
| `min`  | `number` | —       | Minimum value.                                                                                                                |
| `max`  | `number` | —       | Maximum value.                                                                                                                |
| `step` | `number` | —       | Increment between allowed values. Fractional steps are rounded to the step’s decimal precision to avoid floating-point drift. |

### ViewConfig {#view-config}

Configuration object passed to `Slider.view()`.

| Name              | Type                                              | Default | Description                                                                                                                                                                                                                  |
| ----------------- | ------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `model`           | `Slider.Model`                                    | —       | The slider state from your parent Model.                                                                                                                                                                                     |
| `toParentMessage` | `(childMessage: Slider.Message) => ParentMessage` | —       | Wraps Slider Messages in your parent Message type for Submodel delegation.                                                                                                                                                   |
| `value`           | `number`                                          | —       | The current value, read from your parent Model. The thumb position, aria-valuenow, and filled track derive from it. Fold the ChangedValue OutMessage into this field in your update.                                         |
| `toView`          | `(attributes: SliderAttributes) => Html`          | —       | Callback that receives attribute groups for the root, track, filled track, thumb, label, and hidden input elements.                                                                                                          |
| `ariaLabel`       | `string`                                          | —       | Accessible name for screen readers when there is no visible label.                                                                                                                                                           |
| `ariaLabelledBy`  | `string`                                          | —       | ID of an external element whose text serves as the slider’s accessible name.                                                                                                                                                 |
| `formatValue`     | `(value: number) => string`                       | —       | Produces the aria-valuetext announced to screen readers. Use it when the numeric value needs a natural-language form (e.g. "3 of 10" or "50 percent").                                                                       |
| `isDisabled`      | `boolean`                                         | `false` | Whether the slider is disabled. Removes pointer and keyboard interactivity while preserving focusability.                                                                                                                    |
| `name`            | `string`                                          | —       | Form field name. When provided, a hidden input carrying the current numeric value is included for native form submission.                                                                                                    |
| `getTrackRoot`    | `(() => Document \| ShadowRoot) \| undefined`     | —       | Optional accessor returning the DOM root that contains the slider track. Defaults to `document`. Override when rendering inside a Shadow DOM so the drag subscription can find the track element to measure cursor position. |

### SliderAttributes {#slider-attributes}

Attribute groups provided to the `toView` callback.

| Name          | Type                                | Default | Description                                                                                                                                                                                          |
| ------------- | ----------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `root`        | `ReadonlyArray<Attribute<Message>>` | —       | Spread onto the outer wrapper. Carries data-slider-id, data-orientation, and state data attributes.                                                                                                  |
| `track`       | `ReadonlyArray<Attribute<Message>>` | —       | Spread onto the track element (the bar). Carries data-slider-track-id (used by the drag subscription to measure cursor position), positioning styles, and the pointerdown handler for click-to-jump. |
| `filledTrack` | `ReadonlyArray<Attribute<Message>>` | —       | Spread onto an element nested inside the track. Its inline width reflects the current value as a percentage of the range.                                                                            |
| `thumb`       | `ReadonlyArray<Attribute<Message>>` | —       | Spread onto the draggable handle. Carries role="slider", tabindex, aria-value\*, the pointerdown handler, the keyboard handler, and positioning.                                                     |
| `label`       | `ReadonlyArray<Attribute<Message>>` | —       | Spread onto the visible label element. Carries the id the thumb’s aria-labelledby points to by default.                                                                                              |
| `hiddenInput` | `ReadonlyArray<Attribute<Message>>` | —       | Spread onto a hidden `<input>` for form submission. Only populated when the name prop is set.                                                                                                        |

### OutMessage {#out-messages}

Messages emitted to the parent through the third element of `[Model, Commands, Option<OutMessage>]`. Parents pattern-match on the OutMessage in their own update handler.

| Name           | Type                | Default | Description                                                                                                                                                                                                                                                |
| -------------- | ------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ChangedValue` | `{ value: number }` | —       | Emitted whenever the slider value changes via drag, click-to-jump, or keyboard navigation. Pattern-match the third tuple element of Slider.update in your GotSliderMessage handler to react: persist the value, validate, or trigger a downstream Command. |
