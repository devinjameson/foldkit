import {
  Array,
  Match as M,
  Option,
  Predicate,
  Schema as S,
  String,
  pipe,
} from 'effect'

import { html } from '../html'
import type { Html, TagName } from '../html'
import type { Command } from '../runtime/runtime'
import { ts } from '../schema'
import { evo } from '../struct'
import * as Task from '../task'

// MODEL

export const Orientation = S.Literal('Horizontal', 'Vertical')
export type Orientation = typeof Orientation.Type

export const ActivationMode = S.Literal('Automatic', 'Manual')
export type ActivationMode = typeof ActivationMode.Type

export const Model = S.Struct({
  id: S.String,
  activeIndex: S.Number,
  focusedIndex: S.Number,
  orientation: Orientation,
  activationMode: ActivationMode,
})

export type Model = typeof Model.Type

// MESSAGE

export const TabSelected = ts('TabSelected', { index: S.Number })
export const TabFocused = ts('TabFocused', { index: S.Number })
export const NoOp = ts('NoOp')

export const Message = S.Union(TabSelected, TabFocused, NoOp)

export type TabSelected = typeof TabSelected.Type
export type TabFocused = typeof TabFocused.Type
export type NoOp = typeof NoOp.Type

export type Message = typeof Message.Type

// INIT

export type InitConfig = {
  readonly id: string
  readonly activeIndex?: number
  readonly orientation?: Orientation
  readonly activationMode?: ActivationMode
}

export const init = (config: InitConfig): Model => {
  const activeIndex = config.activeIndex ?? 0

  return {
    id: config.id,
    activeIndex,
    focusedIndex: activeIndex,
    orientation: config.orientation ?? 'Horizontal',
    activationMode: config.activationMode ?? 'Automatic',
  }
}

// UPDATE

export const update = (
  model: Model,
  message: Message,
): [Model, ReadonlyArray<Command<Message>>] =>
  M.value(message).pipe(
    M.withReturnType<[Model, ReadonlyArray<Command<Message>>]>(),
    M.tagsExhaustive({
      TabSelected: ({ index }) => {
        const tabSelector = `#${tabId(model.id, index)}`

        return [
          evo(model, {
            activeIndex: () => index,
            focusedIndex: () => index,
          }),
          [Task.focus(tabSelector, () => NoOp.make())],
        ]
      },
      TabFocused: ({ index }) => {
        const tabSelector = `#${tabId(model.id, index)}`

        return [
          evo(model, { focusedIndex: () => index }),
          [Task.focus(tabSelector, () => NoOp.make())],
        ]
      },
      NoOp: () => [model, []],
    }),
  )

// VIEW

export type TabConfig = {
  readonly buttonClassName: string
  readonly buttonContent: Html
  readonly panelClassName: string
  readonly panelContent: Html
}

export type ViewConfig<Message, Tab extends string> = {
  readonly model: Model
  readonly toMessage: (message: TabSelected | TabFocused | NoOp) => Message
  readonly tabs: ReadonlyArray<Tab>
  readonly tabToConfig: (tab: Tab, context: { isActive: boolean }) => TabConfig
  readonly isTabDisabled?: (tab: Tab, index: number) => boolean
  readonly persistPanels?: boolean
  readonly tabListElement?: TagName
  readonly tabElement?: TagName
  readonly panelElement?: TagName
  readonly className?: string
  readonly tabListClassName?: string
}

const tabPanelId = (id: string, index: number): string => `${id}-panel-${index}`

const tabId = (id: string, index: number): string => `${id}-tab-${index}`

export const wrapIndex = (index: number, length: number): number =>
  ((index % length) + length) % length

export const findFirstEnabledIndex =
  (
    tabCount: number,
    focusedIndex: number,
    isDisabled: (index: number) => boolean,
  ) =>
  (startIndex: number, direction: 1 | -1): number =>
    pipe(
      tabCount,
      Array.makeBy((step) =>
        wrapIndex(startIndex + step * direction, tabCount),
      ),
      Array.findFirst(Predicate.not(isDisabled)),
      Option.getOrElse(() => focusedIndex),
    )

export const keyToIndex = (
  nextKey: string,
  previousKey: string,
  tabCount: number,
  focusedIndex: number,
  isDisabled: (index: number) => boolean,
): ((key: string) => number) => {
  const find = findFirstEnabledIndex(tabCount, focusedIndex, isDisabled)

  return (key: string): number =>
    M.value(key).pipe(
      M.when(nextKey, () => find(focusedIndex + 1, 1)),
      M.when(previousKey, () => find(focusedIndex - 1, -1)),
      M.whenOr('Home', 'PageUp', () => find(0, 1)),
      M.whenOr('End', 'PageDown', () => find(tabCount - 1, -1)),
      M.orElse(() => focusedIndex),
    )
}

export const view = <Message, Tab extends string>(
  config: ViewConfig<Message, Tab>,
): Html => {
  const {
    div,
    empty,
    AriaControls,
    AriaDisabled,
    AriaLabelledBy,
    AriaOrientation,
    AriaSelected,
    Class,
    DataAttribute,
    Disabled,
    Hidden,
    Id,
    OnClick,
    OnKeyDown,
    Role,
    Tabindex,
    Type,
    keyed,
  } = html<Message>()

  const {
    model,
    model: { id, orientation, activationMode, focusedIndex },
    toMessage,
    tabs,
    tabToConfig,
    isTabDisabled,
    persistPanels,
    tabListElement = 'div',
    tabElement = 'button',
    panelElement = 'div',
    className,
    tabListClassName,
  } = config

  const isDisabled = (index: number): boolean =>
    !!isTabDisabled &&
    pipe(
      tabs,
      Array.get(index),
      Option.exists((tab) => isTabDisabled(tab, index)),
    )

  const { nextKey, previousKey } = M.value(orientation).pipe(
    M.when('Horizontal', () => ({
      nextKey: 'ArrowRight',
      previousKey: 'ArrowLeft',
    })),
    M.when('Vertical', () => ({
      nextKey: 'ArrowDown',
      previousKey: 'ArrowUp',
    })),
    M.exhaustive,
  )

  const resolveKeyIndex = keyToIndex(
    nextKey,
    previousKey,
    tabs.length,
    focusedIndex,
    isDisabled,
  )

  const handleAutomaticKeyDown = (key: string): Message =>
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    M.value(key).pipe(
      M.whenOr(nextKey, previousKey, 'Home', 'End', 'PageUp', 'PageDown', () =>
        toMessage(TabSelected.make({ index: resolveKeyIndex(key) })),
      ),
      M.whenOr('Enter', ' ', () =>
        toMessage(TabSelected.make({ index: focusedIndex })),
      ),
      M.orElse(() => toMessage(NoOp.make())),
    ) as Message

  const handleManualKeyDown = (key: string): Message =>
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    M.value(key).pipe(
      M.whenOr(nextKey, previousKey, 'Home', 'End', 'PageUp', 'PageDown', () =>
        toMessage(TabFocused.make({ index: resolveKeyIndex(key) })),
      ),
      M.whenOr('Enter', ' ', () =>
        toMessage(TabSelected.make({ index: focusedIndex })),
      ),
      M.orElse(() => toMessage(NoOp.make())),
    ) as Message

  const handleKeyDown = (key: string): Message =>
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    M.value(activationMode).pipe(
      M.when('Automatic', () => handleAutomaticKeyDown(key)),
      M.when('Manual', () => handleManualKeyDown(key)),
      M.exhaustive,
    ) as Message

  const tabButtons = Array.map(tabs, (tab, index) => {
    const isActive = index === model.activeIndex
    const isFocused = index === focusedIndex
    const isTabDisabledAtIndex = isDisabled(index)
    const tabConfig = tabToConfig(tab, { isActive })

    return keyed(tabElement)(
      tabId(id, index),
      [
        Class(tabConfig.buttonClassName),
        Id(tabId(id, index)),
        Role('tab'),
        Type('button'),
        AriaSelected(isActive),
        AriaControls(tabPanelId(id, index)),
        Tabindex(isFocused ? 0 : -1),
        ...(isActive ? [DataAttribute('selected', '')] : []),
        ...(isTabDisabledAtIndex
          ? [Disabled(true), AriaDisabled(true), DataAttribute('disabled', '')]
          : [OnClick(toMessage(TabSelected.make({ index })))]),
        OnKeyDown(handleKeyDown),
      ],
      [tabConfig.buttonContent],
    )
  })

  const allPanels = Array.map(tabs, (tab, index) => {
    const isActive = index === model.activeIndex
    const panelConfig = tabToConfig(tab, { isActive })

    return keyed(panelElement)(
      tabPanelId(id, index),
      [
        Class(panelConfig.panelClassName),
        Id(tabPanelId(id, index)),
        Role('tabpanel'),
        AriaLabelledBy(tabId(id, index)),
        Tabindex(isActive ? 0 : -1),
        Hidden(!isActive),
        ...(isActive ? [DataAttribute('selected', '')] : []),
      ],
      [panelConfig.panelContent],
    )
  })

  const activePanelOnly = pipe(
    tabs,
    Array.get(model.activeIndex),
    Option.match({
      onNone: () => empty,
      onSome: (tab) => {
        const activeConfig = tabToConfig(tab, { isActive: true })

        return keyed(panelElement)(
          tabPanelId(id, model.activeIndex),
          [
            Class(activeConfig.panelClassName),
            Id(tabPanelId(id, model.activeIndex)),
            Role('tabpanel'),
            AriaLabelledBy(tabId(id, model.activeIndex)),
            Tabindex(0),
            DataAttribute('selected', ''),
          ],
          [activeConfig.panelContent],
        )
      },
    }),
  )

  const tabPanels = persistPanels ? allPanels : [activePanelOnly]

  const tabListAttributes = [
    Role('tablist'),
    AriaOrientation(String.toLowerCase(orientation)),
    ...(tabListClassName ? [Class(tabListClassName)] : []),
  ]

  const wrapperAttributes = className ? [Class(className)] : []

  return div(wrapperAttributes, [
    keyed(tabListElement)(`${id}-tablist`, tabListAttributes, tabButtons),
    ...tabPanels,
  ])
}
