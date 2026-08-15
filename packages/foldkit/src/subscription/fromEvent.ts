import { Effect, Option, Queue, Stream } from 'effect'

/**
 * Configuration for the `fromEvent` Stream helper.
 *
 * `target` is read inside the acquire Effect, never before it, so the
 * resolved `EventTarget` is captured at the moment the Subscription's scope
 * opens. Pass a thunk when the target may not exist until the scope opens, or
 * pass the `EventTarget` directly for always-present globals like `window` or
 * `document`.
 *
 * `toMessage(event)` transforms each dispatched event into a Message. The
 * mapper runs synchronously in the same call stack as the browser's event
 * dispatch, so calling `event.preventDefault()` inside it takes effect,
 * unless the listener is passive. Browsers register `wheel`, `mousewheel`,
 * `touchstart`, and `touchmove` listeners as passive by default when the
 * target is `window`, `document`, `document.documentElement`, or
 * `document.body`, and a passive listener ignores `preventDefault()` and
 * logs a console warning. Pass `options: { passive: false }` explicitly to
 * cancel those events, or reach for `fromEventPreventDefault`, which does so
 * for you.
 */
export type FromEventConfig<EventType extends Event, Message> = Readonly<{
  target: EventTarget | (() => EventTarget)
  type: string
  toMessage: (event: EventType) => Message
  options?: AddEventListenerOptions
}>

const resolveTarget = (
  target: EventTarget | (() => EventTarget),
): EventTarget => (typeof target === 'function' ? target() : target)

/**
 * Configuration for the `fromEventFilterMap` Stream helper.
 *
 * `target` is read inside the acquire Effect, never before it, so the
 * resolved `EventTarget` is captured at the moment the Subscription's scope
 * opens. Pass a thunk when the target may not exist until the scope opens, or
 * pass the `EventTarget` directly for always-present globals like `window` or
 * `document`.
 *
 * `toMessage(event)` returns `Option.some(message)` to emit a Message for the
 * event, or `Option.none()` to ignore it. The mapper runs synchronously in the
 * same call stack as the browser's event dispatch, so calling
 * `event.preventDefault()` inside it takes effect, unless the listener is
 * passive. Browsers register `wheel`, `mousewheel`, `touchstart`, and
 * `touchmove` listeners as passive by default when the target is `window`,
 * `document`, `document.documentElement`, or `document.body`, and a passive
 * listener ignores `preventDefault()` and logs a console warning. Pass
 * `options: { passive: false }` explicitly to cancel those events, or reach
 * for `fromEventPreventDefault`, which does so for you.
 */
export type FromEventFilterMapConfig<
  EventType extends Event,
  Message,
> = Readonly<{
  target: EventTarget | (() => EventTarget)
  type: string
  toMessage: (event: EventType) => Option.Option<Message>
  options?: AddEventListenerOptions
}>

/**
 * Configuration for the `fromEventPreventDefault` Stream helper.
 *
 * `target` is read inside the acquire Effect, never before it, so the
 * resolved `EventTarget` is captured at the moment the Subscription's scope
 * opens. Pass a thunk when the target may not exist until the scope opens, or
 * pass the `EventTarget` directly for always-present globals like `window` or
 * `document`.
 *
 * `toMessage(event)` returns `Option.some(message)` to mark the dispatch
 * handled, or `Option.none()` to leave the default behavior intact. For a
 * handled dispatch the runtime calls `event.preventDefault()` and emits the
 * Message; the mapper itself never calls `preventDefault()`.
 *
 * `options.passive` defaults to `false` so `preventDefault()` keeps working
 * for the events browsers would otherwise register as passive. Passing
 * `passive: true` explicitly contradicts the helper's purpose and throws.
 */
export type FromEventPreventDefaultConfig<
  EventType extends Event,
  Message,
> = Readonly<{
  target: EventTarget | (() => EventTarget)
  type: string
  toMessage: (event: EventType) => Option.Option<Message>
  options?: AddEventListenerOptions
}>

/**
 * Build a Stream that emits a Message for the dispatches of a DOM event the
 * mapper chooses to keep, registering the listener when the Stream's scope
 * opens and removing it when the scope closes.
 *
 * This is the filtered variant of `fromEvent`. Its `toMessage` returns
 * `Option.some(message)` to emit and `Option.none()` to ignore the event, so a
 * single listener can react to some dispatches while passing on the rest.
 *
 * Reach for this over a downstream `Stream.filterMap` whenever the decision to
 * keep an event is paired with `event.preventDefault()`. The mapper runs
 * synchronously inside the browser's event dispatch, so `preventDefault()`
 * takes effect, while a downstream filter would run on a later turn after the
 * default action has already happened. The exception is a passive listener,
 * which ignores `preventDefault()` and logs a console warning. Browsers
 * register `wheel`, `mousewheel`, `touchstart`, and `touchmove` listeners as
 * passive by default when the target is `window`, `document`,
 * `document.documentElement`, or `document.body`. Pass
 * `options: { passive: false }` explicitly to cancel those events, or reach
 * for `fromEventPreventDefault`, which does so for you.
 *
 * The listener lifecycle uses `Effect.acquireRelease`. The `addEventListener`
 * call happens inside the acquire Effect, and the matching
 * `removeEventListener` is registered only after acquire completes, so the
 * listener never leaks on interruption.
 *
 * This is a Stream, not a Subscription entry. Wrap it with
 * `Subscription.persistent` for a listener whose lifetime spans the whole
 * Subscriptions record, or plug it into a `Subscription.make` entry's
 * `dependenciesToStream` (typically behind `Stream.when`) to gate it on a
 * Model condition.
 *
 * @example
 * ```typescript
 * const subscriptions = Subscription.make<Model, Message>()(entry => ({
 *   searchShortcut: entry(
 *     { isListening: S.Boolean },
 *     {
 *       modelToDependencies: model => ({ isListening: model.isListening }),
 *       dependenciesToStream: ({ isListening }) =>
 *         Stream.when(
 *           Subscription.fromEventFilterMap<KeyboardEvent, Message>({
 *             target: window,
 *             type: 'keydown',
 *             toMessage: event => {
 *               if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
 *                 event.preventDefault()
 *                 return Option.some(OpenedSearch())
 *               }
 *               return Option.none()
 *             },
 *           }),
 *           Effect.sync(() => isListening),
 *         ),
 *     },
 *   ),
 * }))
 * ```
 */
export const fromEventFilterMap = <EventType extends Event, Message>(
  config: FromEventFilterMapConfig<EventType, Message>,
): Stream.Stream<Message> =>
  Stream.callback<Message>(queue =>
    Effect.acquireRelease(
      Effect.sync(() => {
        const target = resolveTarget(config.target)

        const handleEvent = (event: Event): void => {
          /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
          const maybeMessage = config.toMessage(event as EventType)
          if (Option.isSome(maybeMessage)) {
            Queue.offerUnsafe(queue, maybeMessage.value)
          }
        }

        target.addEventListener(config.type, handleEvent, config.options)
        return { target, handleEvent }
      }),
      ({ target, handleEvent }) =>
        Effect.sync(() => {
          target.removeEventListener(config.type, handleEvent, config.options)
        }),
    ).pipe(Effect.flatMap(() => Effect.never)),
  )

/**
 * Build a Stream that emits a Message for every dispatch of a DOM event,
 * registering the listener when the Stream's scope opens and removing it when
 * the scope closes.
 *
 * The listener lifecycle uses `Effect.acquireRelease`. The `addEventListener`
 * call happens inside the acquire Effect, and the matching
 * `removeEventListener` is registered only after acquire completes, so the
 * listener never leaks on interruption.
 *
 * This is a Stream, not a Subscription entry. Wrap it with
 * `Subscription.persistent` for a listener whose lifetime spans the whole
 * Subscriptions record, or plug it into a `Subscription.make` entry's
 * `dependenciesToStream` (typically behind `Stream.when`) to gate it on a
 * Model condition.
 *
 * For a listener that reacts to only some events, reach for
 * `fromEventFilterMap`, whose mapper returns `Option<Message>`. For a
 * listener that also cancels the default action of the events it handles,
 * reach for `fromEventPreventDefault`.
 *
 * @example
 * ```typescript
 * const subscriptions = Subscription.make<Model, Message>()(entry => ({
 *   shortcut: entry(
 *     { isListening: S.Boolean },
 *     {
 *       modelToDependencies: model => ({ isListening: model.isListening }),
 *       dependenciesToStream: ({ isListening }) =>
 *         Stream.when(
 *           Subscription.fromEvent<KeyboardEvent, Message>({
 *             target: window,
 *             type: 'keydown',
 *             toMessage: event => PressedKey({ key: event.key }),
 *           }),
 *           Effect.sync(() => isListening),
 *         ),
 *     },
 *   ),
 * }))
 * ```
 */
export const fromEvent = <EventType extends Event, Message>(
  config: FromEventConfig<EventType, Message>,
): Stream.Stream<Message> =>
  fromEventFilterMap<EventType, Message>({
    ...config,
    toMessage: event => Option.some(config.toMessage(event)),
  })

/**
 * Build a Stream that emits a Message for the dispatches of a DOM event the
 * mapper marks handled, calling `event.preventDefault()` on each of them,
 * registering the listener when the Stream's scope opens and removing it when
 * the scope closes.
 *
 * This is the cancelling variant of `fromEventFilterMap`, mirroring
 * `h.OnKeyDownPreventDefault` on the html side. Its `toMessage` returns
 * `Option.some(message)` to mark a dispatch handled, and the runtime calls
 * `event.preventDefault()` and emits the Message, both synchronously inside
 * the browser's event dispatch. `Option.none()` leaves the default behavior
 * intact. The mapper never calls `preventDefault()` itself.
 *
 * Because cancelling is the point, the listener registers with
 * `passive: false` when the config does not say otherwise. Browsers register
 * `wheel`, `mousewheel`, `touchstart`, and `touchmove` listeners as passive
 * by default when the target is `window`, `document`,
 * `document.documentElement`, or `document.body`, and a passive listener
 * ignores `preventDefault()` and logs a console warning; the explicit
 * `passive: false` keeps those events cancelable. Passing `passive: true`
 * explicitly contradicts the helper's purpose and throws.
 *
 * The listener lifecycle uses `Effect.acquireRelease`. The `addEventListener`
 * call happens inside the acquire Effect, and the matching
 * `removeEventListener` is registered only after acquire completes, so the
 * listener never leaks on interruption.
 *
 * This is a Stream, not a Subscription entry. Wrap it with
 * `Subscription.persistent` for a listener whose lifetime spans the whole
 * Subscriptions record, or plug it into a `Subscription.make` entry's
 * `dependenciesToStream` (typically behind `Stream.when`) to gate it on a
 * Model condition.
 *
 * @example
 * ```typescript
 * const subscriptions = Subscription.make<Model, Message>()(entry => ({
 *   wheelLock: entry(
 *     { isModalOpen: S.Boolean },
 *     {
 *       modelToDependencies: model => ({ isModalOpen: model.isModalOpen }),
 *       dependenciesToStream: ({ isModalOpen }) =>
 *         Stream.when(
 *           Subscription.fromEventPreventDefault<WheelEvent, Message>({
 *             target: window,
 *             type: 'wheel',
 *             toMessage: () => Option.some(SuppressedWheelScroll()),
 *           }),
 *           Effect.sync(() => isModalOpen),
 *         ),
 *     },
 *   ),
 * }))
 * ```
 */
export const fromEventPreventDefault = <EventType extends Event, Message>(
  config: FromEventPreventDefaultConfig<EventType, Message>,
): Stream.Stream<Message> => {
  if (config.options?.passive === true) {
    throw new Error(
      `Foldkit: \`Subscription.fromEventPreventDefault\` was passed ` +
        `\`options: { passive: true }\` for a "${config.type}" listener. ` +
        `The helper exists to call \`event.preventDefault()\` on every ` +
        `dispatch the mapper marks handled, and a passive listener promises ` +
        `the browser the exact opposite: \`preventDefault()\` inside it is ` +
        `ignored and logs a console warning. Drop the \`passive\` option ` +
        `(the helper registers the listener with \`passive: false\` for ` +
        `you), or use \`Subscription.fromEventFilterMap\` for a listener ` +
        `that only observes.`,
    )
  }

  return fromEventFilterMap<EventType, Message>({
    ...config,
    options: { ...config.options, passive: false },
    toMessage: event => {
      const maybeMessage = config.toMessage(event)
      if (Option.isSome(maybeMessage)) {
        event.preventDefault()
      }
      return maybeMessage
    },
  })
}
