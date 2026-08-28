# Hover Intent

## Overview

HoverIntent is a behavior-only Submodel for a trigger and its related panel. It opens after pointer entry, stays open while the pointer or focus moves between both elements, then closes after the configured grace delay. Focus opens immediately. Escape closes the panel and suppresses reopening until pointer and focus have both left.

It does not create elements, position a panel, assign an ARIA role, or choose a styling hook. Use it when those choices belong to the component you are building. For example, a Hover Card can combine HoverIntent with [Anchor](/ui/anchor), while a Navigation Menu can coordinate several HoverIntent Models with one shared viewport.

## Examples

Hover or focus either trigger, then move into its panel. Press Escape to close it. The trigger and panel are plain elements; HoverIntent supplies only their event bundles.

::Demo{name="demo"}

::Snippet{name="uiHoverIntentBasic" label="hover-intent example"}

HoverIntent's trigger and panel bundles carry child Messages through `h.submodel`. Spreading them into the wrong element changes the interaction model, so put `trigger` on the activator and `panel` on the content that must keep the intent alive.

## Timing and Dismissal

Pointer entry starts `openDelay`, which defaults to 200 milliseconds. Leaving the last hovered or focused element starts `closeDelay`, which defaults to 300 milliseconds. Entering either element again cancels a pending close. Each wait carries a version, so a completion from an earlier interaction cannot change current visibility.

Focus opens immediately. When focus moves from the trigger into the panel, its blur may schedule a close before panel focus arrives. The panel focus handler cancels that close, so keyboard users can enter interactive panel content.

Escape closes immediately. When panel content can hold focus, set `focusTriggerSelector` so Escape returns focus to the trigger before removing the panel. If the selector is omitted or does not resolve to a focusable element, HoverIntent does not move focus; removing the focused panel leaves the browser to choose its fallback focus target. It does not reopen while the pointer or focus still engages the trigger or panel. After both disengage, a fresh entry can open it again.

## API Reference

### init

`(config?: InitConfig) => Model`

Creates a closed HoverIntent Model. `init` takes no `id` because HoverIntent owns no DOM identity.

### InitConfig {#init-config}

| Name         | Type             | Default                | Description                                              |
| ------------ | ---------------- | ---------------------- | -------------------------------------------------------- |
| `openDelay`  | `Duration.Input` | `Duration.millis(200)` | Delay between pointer entry and opening.                 |
| `closeDelay` | `Duration.Input` | `Duration.millis(300)` | Grace period after the final pointer or focus departure. |

### update

`(model: Model, message: Message) => Update.ReturnWithOutMessage<Model, Message, OutMessage>`

Processes pointer, focus, Escape, and wait-completion Messages. `Opened` and `Closed` are emitted only when visibility changes.

### view

`(model: Model, viewInputs: ViewInputs, h: HtmlBuilder<Message>) => Html`

Builds headless trigger and panel event bundles, then calls `ViewInputs.toView`. It does not assign markup, semantics, positioning, or styling.

### ViewInputs {#view-inputs}

| Name                   | Type                           | Description                                                                               |
| ---------------------- | ------------------------------ | ----------------------------------------------------------------------------------------- |
| `focusTriggerSelector` | `string \| undefined`          | Selector for the trigger that receives focus when Escape dismisses focused panel content. |
| `toView`               | `(render: RenderInfo) => Html` | Renders the consumer-owned markup from HoverIntent's event bundles and visibility state.  |

### RenderInfo {#render-info}

| Name        | Type                            | Description                                                                  |
| ----------- | ------------------------------- | ---------------------------------------------------------------------------- |
| `trigger`   | `ReadonlyArray<ChildAttribute>` | Hover, focus, and Escape attributes for the trigger element.                 |
| `panel`     | `ReadonlyArray<ChildAttribute>` | Hover, focus, and Escape attributes for the panel element.                   |
| `isVisible` | `boolean`                       | Whether the HoverIntent Model is open. Render the panel conditionally on it. |

### Message

`EnteredTrigger`, `LeftTrigger`, `EnteredPanel`, and `LeftPanel` describe pointer movement. `FocusedTrigger`, `BlurredTrigger`, `FocusedPanel`, and `BlurredPanel` describe focus movement. `PressedEscape` records whether Escape came from the trigger or panel. `CompletedWaitBeforeOpening` and `CompletedWaitBeforeClosing` are produced only by the exported wait Commands.

### OutMessage {#out-message}

| Name     | Description                                             |
| -------- | ------------------------------------------------------- |
| `Opened` | Emitted when the Model transitions from closed to open. |
| `Closed` | Emitted when the Model transitions from open to closed. |

### WaitBeforeOpening and WaitBeforeClosing {#wait-commands}

These Commands wait for the configured delay and emit their matching completion Message with its scheduling version. They are exported for Story tests. Application code should let `update` issue and resolve them through the normal Runtime.
