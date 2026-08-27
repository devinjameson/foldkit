import { Duration, Effect, Match as M, Option, Schema as S } from 'effect'
import * as Command from 'foldkit/command'
import { type ChildAttribute, type Html, childAttributes } from 'foldkit/html'
import { evo } from 'foldkit/struct'
import { defineView } from 'foldkit/submodel'
import * as Update from 'foldkit/update'

import { Message, OutMessage } from './message.js'

// MODEL

/** Schema for hover-intent state. It tracks pointer and focus engagement over a trigger and its panel, visibility, delay timers, and Escape dismissal. */
export const Model = S.Struct({
  isOpen: S.Boolean,
  isTriggerHovered: S.Boolean,
  isPanelHovered: S.Boolean,
  isFocused: S.Boolean,
  isDismissed: S.Boolean,
  openDelay: S.DurationFromMillis,
  closeDelay: S.DurationFromMillis,
  pendingOpenVersion: S.Number,
  pendingCloseVersion: S.Number,
})
export type Model = typeof Model.Type

const DEFAULT_OPEN_DELAY = Duration.millis(200)
const DEFAULT_CLOSE_DELAY = Duration.millis(300)

/** Configuration for creating a hover-intent model. */
export type InitConfig = Readonly<{
  openDelay?: Duration.Input
  closeDelay?: Duration.Input
}>

/** Creates a hover-intent model. Pointer entry opens after 200 milliseconds and full disengagement closes after 300 milliseconds by default. */
export const init = (config: InitConfig = {}): Model => ({
  isOpen: false,
  isTriggerHovered: false,
  isPanelHovered: false,
  isFocused: false,
  isDismissed: false,
  openDelay:
    config.openDelay === undefined
      ? DEFAULT_OPEN_DELAY
      : Duration.fromInputUnsafe(config.openDelay),
  closeDelay:
    config.closeDelay === undefined
      ? DEFAULT_CLOSE_DELAY
      : Duration.fromInputUnsafe(config.closeDelay),
  pendingOpenVersion: 0,
  pendingCloseVersion: 0,
})

// COMMAND

/** Waits before opening, then emits the version that scheduled the wait. */
export const WaitBeforeOpening = Command.define('WaitBeforeOpening', {
  args: { delay: S.DurationFromMillis, version: S.Number },
  messages: [Message.CompletedWaitBeforeOpening],
  execute: ({ delay, version }) =>
    Effect.sleep(delay).pipe(
      Effect.as(Message.CompletedWaitBeforeOpening({ version })),
    ),
})

/** Waits before closing, then emits the version that scheduled the wait. */
export const WaitBeforeClosing = Command.define('WaitBeforeClosing', {
  args: { delay: S.DurationFromMillis, version: S.Number },
  messages: [Message.CompletedWaitBeforeClosing],
  execute: ({ delay, version }) =>
    Effect.sleep(delay).pipe(
      Effect.as(Message.CompletedWaitBeforeClosing({ version })),
    ),
})

type UpdateReturn = Update.ReturnWithOutMessage<Model, Message, OutMessage>

const isPointerOver = (model: Model): boolean =>
  model.isTriggerHovered || model.isPanelHovered

const isEngaged = (model: Model): boolean =>
  isPointerOver(model) || model.isFocused

const open = (model: Model): UpdateReturn => {
  if (model.isOpen) {
    return { model }
  }

  return {
    model: evo(model, { isOpen: () => true }),
    outMessage: OutMessage.Opened(),
  }
}

const close = (model: Model): UpdateReturn => {
  if (!model.isOpen) {
    return { model }
  }

  return {
    model: evo(model, { isOpen: () => false }),
    outMessage: OutMessage.Closed(),
  }
}

const scheduleOpen = (model: Model): UpdateReturn => {
  const version = model.pendingOpenVersion + 1
  return {
    model: evo(model, { pendingOpenVersion: () => version }),
    commands: [WaitBeforeOpening({ delay: model.openDelay, version })],
  }
}

const scheduleClose = (model: Model): UpdateReturn => {
  const version = model.pendingCloseVersion + 1
  return {
    model: evo(model, { pendingCloseVersion: () => version }),
    commands: [WaitBeforeClosing({ delay: model.closeDelay, version })],
  }
}

const entered = (model: Model): UpdateReturn => {
  const enteredModel = evo(model, {
    pendingCloseVersion: currentVersion => currentVersion + 1,
  })

  if (enteredModel.isOpen || enteredModel.isDismissed) {
    return { model: enteredModel }
  }

  return scheduleOpen(enteredModel)
}

const left = (model: Model): UpdateReturn => {
  const leftModel = evo(model, {
    pendingOpenVersion: currentVersion => currentVersion + 1,
  })

  if (isEngaged(leftModel)) {
    return { model: leftModel }
  }

  if (leftModel.isDismissed) {
    return { model: evo(leftModel, { isDismissed: () => false }) }
  }

  if (!leftModel.isOpen) {
    return { model: leftModel }
  }

  return scheduleClose(leftModel)
}

const focused = (model: Model): UpdateReturn => {
  const focusedModel = evo(model, {
    isFocused: () => true,
    pendingOpenVersion: currentVersion => currentVersion + 1,
    pendingCloseVersion: currentVersion => currentVersion + 1,
  })

  if (focusedModel.isDismissed) {
    return { model: focusedModel }
  }

  return open(focusedModel)
}

const blurred = (model: Model): UpdateReturn => {
  const blurredModel = evo(model, {
    isFocused: () => false,
    pendingOpenVersion: currentVersion => currentVersion + 1,
  })

  if (isEngaged(blurredModel)) {
    return { model: blurredModel }
  }

  if (blurredModel.isDismissed) {
    return { model: evo(blurredModel, { isDismissed: () => false }) }
  }

  if (!blurredModel.isOpen) {
    return { model: blurredModel }
  }

  return scheduleClose(blurredModel)
}

/** Processes a hover-intent Message and returns the next Model, optional Commands, and an optional OutMessage. */
export const update = (model: Model, message: Message): UpdateReturn =>
  Message.match<UpdateReturn>(message, {
    EnteredTrigger: () => entered(evo(model, { isTriggerHovered: () => true })),

    LeftTrigger: () => left(evo(model, { isTriggerHovered: () => false })),

    EnteredPanel: () => entered(evo(model, { isPanelHovered: () => true })),

    LeftPanel: () => left(evo(model, { isPanelHovered: () => false })),

    FocusedTrigger: () => focused(model),

    BlurredTrigger: () => blurred(model),

    FocusedPanel: () => focused(model),

    BlurredPanel: () => blurred(model),

    PressedEscape: ({ source, isFocusReturnedToTrigger }) => {
      const dismissedModel = evo(model, {
        isOpen: () => false,
        isPanelHovered: () => false,
        isFocused: () => source === 'Trigger' || isFocusReturnedToTrigger,
        isDismissed: () => true,
        pendingOpenVersion: currentVersion => currentVersion + 1,
        pendingCloseVersion: currentVersion => currentVersion + 1,
      })

      if (model.isOpen) {
        return { model: dismissedModel, outMessage: OutMessage.Closed() }
      }

      return { model: dismissedModel }
    },

    CompletedWaitBeforeOpening: ({ version }) => {
      if (
        version !== model.pendingOpenVersion ||
        model.isDismissed ||
        !isEngaged(model)
      ) {
        return { model }
      }

      return open(model)
    },

    CompletedWaitBeforeClosing: ({ version }) => {
      if (version !== model.pendingCloseVersion || isEngaged(model)) {
        return { model }
      }

      return close(model)
    },
  })

// VIEW

/** Render-time payload published to the consumer's `toView`.
 *
 * - `trigger`: event attributes for the element that starts intent.
 * - `panel`: event attributes for the element that remains open while hovered or focused.
 * - `isVisible`: whether the consumer should render its panel. */
export type RenderInfo = Readonly<{
  trigger: ReadonlyArray<ChildAttribute>
  panel: ReadonlyArray<ChildAttribute>
  isVisible: boolean
}>

/** Per-render view inputs passed to `view` via `h.submodel`'s `viewInputs` field. */
export type ViewInputs = Readonly<{
  focusTriggerSelector?: string
  toView: (render: RenderInfo) => Html
}>

/** Renders headless hover-intent event bundles. It deliberately owns no markup, ARIA semantics, positioning, or styling. */
export const view = defineView<Model, Message, ViewInputs>(
  (model, { focusTriggerSelector, toView }, h): Html => {
    const toPressedEscape =
      (source: 'Trigger' | 'Panel', isFocusReturnedToTrigger: boolean) =>
      (key: string): Option.Option<typeof Message.PressedEscape.Type> =>
        M.value(key).pipe(
          M.when('Escape', () =>
            Option.some(
              Message.PressedEscape({ source, isFocusReturnedToTrigger }),
            ),
          ),
          M.orElse(() => Option.none()),
        )

    const panelEscapeHandler =
      focusTriggerSelector === undefined
        ? h.OnKeyDownPreventDefault(toPressedEscape('Panel', false))
        : h.OnKeyDownFocus(key =>
            M.value(key).pipe(
              M.when('Escape', () =>
                Option.some({
                  focusSelector: focusTriggerSelector,
                  message: Message.PressedEscape({
                    source: 'Panel',
                    isFocusReturnedToTrigger: true,
                  }),
                }),
              ),
              M.orElse(() => Option.none()),
            ),
          )

    return toView({
      trigger: childAttributes([
        h.OnMouseEnter(Message.EnteredTrigger()),
        h.OnMouseLeave(Message.LeftTrigger()),
        h.OnFocus(Message.FocusedTrigger()),
        h.OnBlur(Message.BlurredTrigger()),
        h.OnKeyDownPreventDefault(toPressedEscape('Trigger', false)),
      ]),
      panel: childAttributes([
        h.OnMouseEnter(Message.EnteredPanel()),
        h.OnMouseLeave(Message.LeftPanel()),
        h.OnFocusEnter(Message.FocusedPanel()),
        h.OnFocusLeave(Message.BlurredPanel()),
        panelEscapeHandler,
      ]),
      isVisible: model.isOpen,
    })
  },
)
