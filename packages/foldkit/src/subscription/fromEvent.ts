import { Effect, Option, Queue, Stream } from 'effect'

declare const EventMapMarker: unique symbol

/**
 * An `EventTarget` that declares the events it dispatches, so `fromEvent` and
 * `fromEventFilterMap` can resolve an event name to its event type the way
 * they do for `window`, `document`, and the DOM interfaces lib.dom declares
 * event maps for.
 *
 * Annotate a target with this and the mapper's parameter follows from the
 * event name, including a `CustomEvent`'s `detail`. A declared map wins over
 * the built-in table, so an element that dispatches its own custom events can
 * be annotated too. Any `EventTarget` is assignable to it, so the annotation
 * is the only change needed.
 *
 * @example
 * ```ts
 * const slowWarningTarget: Subscription.TypedEventTarget<{
 *   'foldkit:slow-warning': CustomEvent<SlowWarningReport>
 * }> = new EventTarget()
 * ```
 */
export interface TypedEventTarget<EventMap extends object> extends EventTarget {
  readonly [EventMapMarker]?: EventMap
}

type EventMapMarkerKey = typeof EventMapMarker

/**
 * The marker property is optional, so every `EventTarget` is assignable to a
 * `TypedEventTarget` and a bare one needs no annotation. That also means
 * `extends TypedEventTarget<infer EventMap>` matches everything, so the test
 * for an annotated target is whether the marker is one of its keys.
 */
type DeclaredEventMap<Target> = EventMapMarkerKey extends keyof Target
  ? NonNullable<Target[EventMapMarkerKey & keyof Target]>
  : never

/**
 * The event maps lib.dom declares for interfaces that are not Elements.
 * Ordered most specific first, so `XMLHttpRequest` resolves to its own map
 * rather than the one it inherits.
 */
type HostEventMapOf<Target> = Target extends Window
  ? WindowEventMap
  : Target extends Document
    ? DocumentEventMap
    : Target extends ShadowRoot
      ? ShadowRootEventMap
      : Target extends MediaQueryList
        ? MediaQueryListEventMap
        : Target extends VisualViewport
          ? VisualViewportEventMap
          : Target extends ScreenOrientation
            ? ScreenOrientationEventMap
            : Target extends AbortSignal
              ? AbortSignalEventMap
              : Target extends WebSocket
                ? WebSocketEventMap
                : Target extends EventSource
                  ? EventSourceEventMap
                  : Target extends XMLHttpRequest
                    ? XMLHttpRequestEventMap
                    : Target extends XMLHttpRequestEventTarget
                      ? XMLHttpRequestEventTargetEventMap
                      : Target extends ServiceWorker
                        ? ServiceWorkerEventMap
                        : Target extends Worker
                          ? WorkerEventMap
                          : Target extends MessagePort
                            ? MessagePortEventMap
                            : Target extends BroadcastChannel
                              ? BroadcastChannelEventMap
                              : Target extends FileReader
                                ? FileReaderEventMap
                                : Target extends Notification
                                  ? NotificationEventMap
                                  : Target extends MediaRecorder
                                    ? MediaRecorderEventMap
                                    : Target extends RTCPeerConnection
                                      ? RTCPeerConnectionEventMap
                                      : Target extends RTCDataChannel
                                        ? RTCDataChannelEventMap
                                        : Target extends PermissionStatus
                                          ? PermissionStatusEventMap
                                          : Target extends Animation
                                            ? AnimationEventMap
                                            : Target extends MediaDevices
                                              ? MediaDevicesEventMap
                                              : never

/**
 * The event maps lib.dom declares for Elements. Ordered most specific first,
 * so an `HTMLVideoElement` resolves to its own map rather than the one it
 * inherits.
 */
type ElementEventMapOf<Target> = Target extends HTMLVideoElement
  ? HTMLVideoElementEventMap
  : Target extends HTMLMediaElement
    ? HTMLMediaElementEventMap
    : Target extends HTMLBodyElement
      ? HTMLBodyElementEventMap
      : Target extends HTMLFrameSetElement
        ? HTMLFrameSetElementEventMap
        : Target extends HTMLElement
          ? HTMLElementEventMap
          : Target extends SVGSVGElement
            ? SVGSVGElementEventMap
            : Target extends SVGElement
              ? SVGElementEventMap
              : Target extends Element
                ? ElementEventMap & GlobalEventHandlersEventMap
                : never

/**
 * The events a target dispatches.
 *
 * A map declared through {@link TypedEventTarget} wins, so a target can
 * describe events lib.dom knows nothing about even when lib.dom also declares
 * a map for it. Otherwise the built-in tables answer. A target neither
 * annotated nor tabulated, such as a bare `EventTarget`, resolves to every
 * event name at type `Event`, which keeps custom targets usable without
 * annotation.
 */
export type EventMapOf<Target> = [DeclaredEventMap<Target>] extends [never]
  ? [HostEventMapOf<Target>] extends [never]
    ? [ElementEventMapOf<Target>] extends [never]
      ? Readonly<Record<string, Event>>
      : ElementEventMapOf<Target>
    : HostEventMapOf<Target>
  : DeclaredEventMap<Target>

/** The event names a target declares. */
export type EventTypeOf<Target> = keyof EventMapOf<Target> & string

/** The event a target dispatches under a given event name. */
export type EventOf<
  Target,
  Type extends string,
> = Type extends keyof EventMapOf<Target>
  ? EventMapOf<Target>[Type] extends infer Resolved extends Event
    ? Resolved
    : Event
  : Event

/**
 * Configuration for the `fromEvent` Stream helper.
 *
 * `target` is read inside the acquire Effect, never before it, so the
 * resolved `EventTarget` is captured at the moment the Subscription's scope
 * opens. Pass a thunk when the target may not exist until the scope opens, or
 * pass the `EventTarget` directly for always-present globals like `window` or
 * `document`.
 *
 * `type` is constrained to the event names the target declares, and
 * `toMessage`'s parameter is the event those two resolve to. Annotating that
 * parameter is checked against the resolved event rather than replacing it.
 *
 * `toMessage(event)` transforms each dispatched event into a Message. The
 * mapper runs synchronously in the same call stack as the browser's event
 * dispatch, so calling `event.preventDefault()` inside it works as expected.
 */
export type FromEventConfig<
  Target extends EventTarget,
  Type extends string,
  Message,
> = Readonly<{
  target: Target | (() => Target)
  type: Type
  toMessage: (event: EventOf<Target, Type>) => Message
  options?: AddEventListenerOptions
}>

/**
 * Configuration for the `fromEventFilterMap` Stream helper.
 *
 * `target` is read inside the acquire Effect, never before it, so the
 * resolved `EventTarget` is captured at the moment the Subscription's scope
 * opens. Pass a thunk when the target may not exist until the scope opens, or
 * pass the `EventTarget` directly for always-present globals like `window` or
 * `document`.
 *
 * `type` is constrained to the event names the target declares, and
 * `toMessage`'s parameter is the event those two resolve to. Annotating that
 * parameter is checked against the resolved event rather than replacing it.
 *
 * `toMessage(event)` returns `Option.some(message)` to emit a Message for the
 * event, or `Option.none()` to ignore it. The mapper runs synchronously in the
 * same call stack as the browser's event dispatch, so calling
 * `event.preventDefault()` inside it works as expected.
 */
export type FromEventFilterMapConfig<
  Target extends EventTarget,
  Type extends string,
  Message,
> = Readonly<{
  target: Target | (() => Target)
  type: Type
  toMessage: (event: EventOf<Target, Type>) => Option.Option<Message>
  options?: AddEventListenerOptions
}>

type AnyConfig<Message> = Readonly<{
  target: EventTarget | (() => EventTarget)
  type: string
  toMessage: (event: never) => Option.Option<Message>
  options?: AddEventListenerOptions
}>

const resolveTarget = (
  target: EventTarget | (() => EventTarget),
): EventTarget => (typeof target === 'function' ? target() : target)

const listen = <Message>(config: AnyConfig<Message>): Stream.Stream<Message> =>
  Stream.callback<Message>(queue =>
    Effect.acquireRelease(
      Effect.sync(() => {
        const target = resolveTarget(config.target)

        const handleEvent = (event: Event): void => {
          /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
          const maybeMessage = config.toMessage(event as never)
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
 * Build a Stream that emits a Message for the dispatches of a DOM event the
 * mapper chooses to keep, registering the listener when the Stream's scope
 * opens and removing it when the scope closes.
 *
 * This is the filtered variant of `fromEvent`. Its `toMessage` returns
 * `Option.some(message)` to emit and `Option.none()` to ignore the event, so a
 * single listener can react to some dispatches while passing on the rest. A
 * mapper that never emits produces a `Stream<never>`, which composes wherever
 * a Message-producing Stream is expected.
 *
 * Reach for this over a downstream `Stream.filterMap` whenever the decision to
 * keep an event is paired with `event.preventDefault()`. The mapper runs
 * synchronously inside the browser's event dispatch, so `preventDefault()`
 * takes effect, while a downstream filter would run on a later turn after the
 * default action has already happened.
 *
 * The target, the event name, and the event the mapper receives are one fact:
 * `type` is constrained to the names the target declares, and the mapper's
 * parameter is what those two resolve to, so annotating it narrows nothing and
 * cannot contradict the name. A target that is neither annotated nor one
 * lib.dom declares a map for accepts any name and reports `Event`; annotate it
 * with {@link TypedEventTarget} to resolve its own events.
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
 *           Subscription.fromEventFilterMap({
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
export const fromEventFilterMap = <
  Target extends EventTarget,
  Type extends EventTypeOf<Target>,
  Message,
>(
  config: FromEventFilterMapConfig<Target, Type, Message>,
): Stream.Stream<Message> => listen(config)

/**
 * Build a Stream that emits a Message for every dispatch of a DOM event,
 * registering the listener when the Stream's scope opens and removing it when
 * the scope closes.
 *
 * The target, the event name, and the event the mapper receives are one fact:
 * `type` is constrained to the names the target declares, and the mapper's
 * parameter is what those two resolve to, so annotating it narrows nothing and
 * cannot contradict the name. A target that is neither annotated nor one
 * lib.dom declares a map for accepts any name and reports `Event`; annotate it
 * with {@link TypedEventTarget} to resolve its own events.
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
 * `fromEventFilterMap`, whose mapper returns `Option<Message>`.
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
 *           Subscription.fromEvent({
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
export const fromEvent = <
  Target extends EventTarget,
  Type extends EventTypeOf<Target>,
  Message,
>(
  config: FromEventConfig<Target, Type, Message>,
): Stream.Stream<Message> =>
  listen({
    ...config,
    toMessage: event => Option.some(config.toMessage(event)),
  })
