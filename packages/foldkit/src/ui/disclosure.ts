import { Match as M, Option, Schema as S } from 'effect'

import { html } from '../html'
import type { Html, TagName } from '../html'
import type { Command } from '../runtime/runtime'
import { ts } from '../schema'
import { evo } from '../struct'
import * as Task from '../task'

// MODEL

export const Model = S.Struct({
  id: S.String,
  isOpen: S.Boolean,
})

export type Model = typeof Model.Type

// MESSAGE

export const Toggled = ts('Toggled')
export const Closed = ts('Closed')
export const NoOp = ts('NoOp')

export const Message = S.Union(Toggled, Closed, NoOp)

export type Toggled = typeof Toggled.Type
export type Closed = typeof Closed.Type
export type NoOp = typeof NoOp.Type

export type Message = typeof Message.Type

// INIT

export type InitConfig = {
  readonly id: string
  readonly isOpen?: boolean
}

export const init = (config: InitConfig): Model => ({
  id: config.id,
  isOpen: config.isOpen ?? false,
})

// UPDATE

export const buttonId = (id: string): string => `${id}-button`

export const panelId = (id: string): string => `${id}-panel`

export const update = (
  model: Model,
  message: Message,
): [Model, ReadonlyArray<Command<Message>>] =>
  M.value(message).pipe(
    M.withReturnType<[Model, ReadonlyArray<Command<Message>>]>(),
    M.tagsExhaustive({
      Toggled: () => {
        const maybeFocusCommand = Option.liftPredicate(
          Task.focus(`#${buttonId(model.id)}`, () => NoOp.make()),
          () => model.isOpen,
        )

        return [
          evo(model, { isOpen: () => !model.isOpen }),
          Option.toArray(maybeFocusCommand),
        ]
      },
      Closed: () => {
        const maybeFocusCommand = Option.liftPredicate(
          Task.focus(`#${buttonId(model.id)}`, () => NoOp.make()),
          () => model.isOpen,
        )

        return [
          evo(model, { isOpen: () => false }),
          Option.toArray(maybeFocusCommand),
        ]
      },
      NoOp: () => [model, []],
    }),
  )

// VIEW

export type ViewConfig<Message> = {
  readonly model: Model
  readonly toMessage: (message: Toggled | Closed | NoOp) => Message
  readonly buttonClassName: string
  readonly buttonContent: Html
  readonly panelClassName: string
  readonly panelContent: Html
  readonly isDisabled?: boolean
  readonly persistPanel?: boolean
  readonly buttonElement?: TagName
  readonly panelElement?: TagName
  readonly className?: string
}

export const view = <Message>(config: ViewConfig<Message>): Html => {
  const {
    div,
    empty,
    AriaControls,
    AriaDisabled,
    AriaExpanded,
    Class,
    DataAttribute,
    Disabled,
    Hidden,
    Id,
    OnClick,
    OnKeyDown,
    Tabindex,
    Type,
    keyed,
  } = html<Message>()

  const {
    model: { id, isOpen },
    toMessage,
    buttonClassName,
    buttonContent,
    panelClassName,
    panelContent,
    isDisabled,
    persistPanel,
    buttonElement = 'button',
    panelElement = 'div',
    className,
  } = config

  const isNativeButton = buttonElement === 'button'

  const handleKeyDown = (key: string): Message =>
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    M.value(key).pipe(
      M.whenOr('Enter', ' ', () => toMessage(Toggled.make())),
      M.orElse(() => toMessage(NoOp.make())),
    ) as Message

  const disabledAttributes = [
    Disabled(true),
    AriaDisabled(true),
    DataAttribute('disabled', ''),
  ]

  const interactionAttributes = isDisabled
    ? disabledAttributes
    : [
        OnClick(toMessage(Toggled.make())),
        ...(!isNativeButton ? [OnKeyDown(handleKeyDown)] : []),
      ]

  const buttonAttributes = [
    Class(buttonClassName),
    Id(buttonId(id)),
    AriaExpanded(isOpen),
    AriaControls(panelId(id)),
    ...(isNativeButton ? [Type('button')] : [Tabindex(0)]),
    ...(isOpen ? [DataAttribute('open', '')] : []),
    ...interactionAttributes,
  ]

  const panelAttributes = [
    Class(panelClassName),
    Id(panelId(id)),
    ...(isOpen ? [DataAttribute('open', '')] : []),
  ]

  const persistedPanel = keyed(panelElement)(
    panelId(id),
    [...panelAttributes, Hidden(!isOpen)],
    [panelContent],
  )

  const activePanel = isOpen
    ? keyed(panelElement)(panelId(id), panelAttributes, [panelContent])
    : empty

  const panel = persistPanel ? persistedPanel : activePanel

  const wrapperAttributes = className ? [Class(className)] : []

  return div(wrapperAttributes, [
    keyed(buttonElement)(buttonId(id), buttonAttributes, [buttonContent]),
    panel,
  ])
}
