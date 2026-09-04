import {
  Array,
  Cause,
  Context,
  Duration,
  Effect,
  Exit,
  Fiber,
  Layer,
  Option,
  Predicate,
  PubSub,
  Schema,
  pipe,
} from 'effect'

import {
  type BoundaryRegistry,
  Document,
  type HtmlBuilder,
  __beginRender as beginHtmlRender,
  __beginReplayRender as beginReplayHtmlRender,
  __clearRuntime as clearHtmlRuntime,
  __createBoundaryRegistry as createHtmlBoundaryRegistry,
  __endReplayRender as endReplayHtmlRender,
  __flushReplayUnmountsAfterPatchFailure as flushReplayUnmountsAfterPatchFailure,
  __htmlBuilder as htmlBuilderFor,
  __setRuntime as setHtmlRuntime,
} from '../html/index.js'
import { __hydrateVNode } from '../hydrate.js'
import { FOLDKIT_APP_ATTRIBUTE } from '../hydrationMarker.js'
import type { ManagedResources } from '../managedResource/index.js'
import { MountRuntime, MountTracker } from '../mount/index.js'
import type { Ports } from '../port/index.js'
import { RenderCommit, createCommitNotifier } from '../render/commit.js'
import type { Subscriptions } from '../subscription/subscription.js'
import type { Return as UpdateReturn } from '../update/index.js'
import { Url, fromString as urlFromString } from '../url/index.js'
import {
  VNode,
  __patchVNode,
  __recoverVNodeAfterPatchFailure,
} from '../vdom.js'
import {
  type RoutingConfig,
  addNavigationEventListeners,
} from './browserListeners.js'
import {
  type CrashConfig,
  type VNodeSlot,
  noOpDispatch,
  renderCrashView,
} from './crashUI.js'
import { deepFreeze } from './deepFreeze.js'
import type { DevToolsConfig } from './devToolsConfig.js'
import { makeDevToolsIntegration } from './devToolsIntegration.js'
import { Dispatch } from './dispatch.js'
import { applyDocumentMetadata } from './documentMetadata.js'
import { createDuplicateIdScanner } from './duplicateIdScanner.js'
import { preserveModel } from './hmrModelBridge.js'
import {
  preserveScrollPosition,
  restorePreservedScrollPosition,
} from './hmrScroll.js'
import {
  type HostConnector,
  type PortChannelsBundle,
  makePortChannels,
  validatePorts,
} from './hostConnector.js'
import {
  type HydrationConfig,
  buildSkew,
  containRefusedPage,
} from './hydrationHandoff.js'
import { forkManagedResourceFibers } from './managedResourceFibers.js'
import { makeMessageQueue } from './messageQueue.js'
import { makePreserveScheduler } from './preserveScheduler.js'
import { makeResourceProvider } from './resourceProvider.js'
import { makeRuntimeStatus } from './runtimeStatus.js'
import {
  type SlowConfig,
  type SlowPatchContext,
  type SlowUpdateContext,
  type SlowViewContext,
  __resolveSlowConfig,
  measureSlowPhase,
  reportSlowPhase,
} from './slowPhase.js'
import { forkSubscriptionFibers } from './subscriptionFibers.js'
import {
  type StartViewTransition,
  type ViewTransitionConfig,
  type ViewTransitionHandle,
  __decideViewTransition,
  __resolveStartViewTransition,
  __silenceViewTransitionRejections,
} from './viewTransition.js'
import { type Visibility, isVisible } from './visibility.js'

type AnyCommand<T, E = never, R = never> = {
  readonly name: string
  readonly args?: Record<string, unknown>
  readonly effect: Effect.Effect<T, E, R>
}

/** The `viewTransition` config resolved against the running browser: the
 *  predicate, the feature-detected `startViewTransition`, and the cached
 *  reduced-motion query. Absent (the runtime holds `Option.none()`) when the
 *  app did not configure `viewTransition` or the browser lacks the API. */
type ResolvedViewTransition<Model, Message> = Readonly<{
  decide: ViewTransitionConfig<Model, Message>
  startViewTransition: StartViewTransition
  reducedMotionQuery: MediaQueryList
}>

type RenderMode = 'Live' | 'Replay'

/** Full runtime configuration including Model Schema, Flags, init, update, view, and optional routing/stream config. */
export type RuntimeConfig<
  Model,
  Message,
  Flags,
  Resources = never,
  ManagedResourceServices = never,
  P extends Ports | undefined = undefined,
  Kind extends 'Application' | 'Element' = 'Application' | 'Element',
> = Readonly<{
  kind: Kind
  ports: P
  Model: Schema.Codec<Model, any, unknown, unknown>
  Flags: Schema.Codec<Flags, any, unknown, unknown>
  configuredFlags: Option.Option<Effect.Effect<Flags, never, Resources>>
  isFlagsRequired: boolean
  init: (
    flags: Flags,
    url?: Url,
  ) => UpdateReturn<Model, Message, Resources | ManagedResourceServices>
  update: (
    model: Model,
    message: Message,
  ) => UpdateReturn<Model, Message, Resources | ManagedResourceServices>
  view: (model: Model, h: HtmlBuilder<Message>) => Document
  /**
   * Whether the runtime owns document-level state. When `true`, each render
   * applies the view's `title`, `canonical`, and `og:url` to the document
   * `<head>`. When `false`, the runtime is scoped to its container and never
   * touches the `<head>`, so an app can be embedded at a node without
   * clobbering the host page's metadata. `makeApplication` sets this to `true`;
   * `makeElement` sets it to `false`.
   */
  manageDocument: boolean
  subscriptions?: Subscriptions<
    Model,
    Message,
    Resources | ManagedResourceServices
  >
  container: HTMLElement
  /**
   * Present when `makeApplication` found a server-rendered root stamped with
   * `data-foldkit-app`. The first render then adopts that DOM in place
   * instead of replacing it, and when the config declares Flags, `init` is
   * fed the Schema-decoded Flags payload the server embedded, so both sides
   * compute the same Model. Missing or undecodable handoff data is fatal.
   * An HMR-restored Model gets a fresh replace boot against the stamped root
   * because the restored code may no longer match the served DOM.
   */
  hydration?: HydrationConfig
  routing?: RoutingConfig<Message>
  crash?: CrashConfig<Model, Message>
  slow?: SlowConfig<Model, Message>
  /**
   * Wraps qualifying renders in `document.startViewTransition` so the browser
   * animates between the old and new DOM states. Return `false` for a plain
   * render, `true` to transition, or `{ types }` to tag the transition for
   * `:active-view-transition-type(...)` CSS scoping.
   *
   * The predicate runs after `update` and before the render it is deciding
   * about, and receives both states: `context.previousModel` is the Model
   * behind the DOM on screen, `context.model` is the one the render will
   * paint. Comparing the two is how a predicate derives direction without the
   * application keeping route history in its Model.
   *
   * Renders fall through to the plain path when the browser lacks the API,
   * when `prefers-reduced-motion: reduce` is set, and during DevTools replay,
   * crash, and initial renders.
   *
   * Defaults to `undefined`: no render is wrapped in a transition, and the
   * runtime resolves nothing about the browser's support for them.
   */
  viewTransition?: ViewTransitionConfig<Model, Message>
  /**
   * Deep-freezes the Model after `init` and after every `update`, so accidental
   * mutations (e.g. `model.items.push(...)`) throw a `TypeError` at the exact
   * write site with a stack trace, rather than silently corrupting state or
   * breaking reference-equality change detection.
   *
   * Defaults to `true`. Activates only when Vite HMR is available, so production
   * builds pay nothing. Pass `false` to disable.
   *
   * Scope: only the Model is frozen. Messages are short-lived and are not
   * frozen.
   */
  freezeModel?: boolean
  /**
   * Restores the window scroll position across Vite HMR reloads. Every edit
   * triggers a full page reload, which resets scroll to the top; this captures
   * `window.scrollX`/`scrollY` just before the reload and reapplies it once the
   * restored view has rendered, so editing a page you've scrolled deep into
   * doesn't bounce you back to the top on every save.
   *
   * Defaults to `true`. Activates only when Vite HMR is available and the
   * runtime owns the document, so production builds and embedded `makeElement`
   * apps (which do not own the page's scroll) pay nothing. Pass `false` to
   * disable, for an app that drives its own scroll restoration.
   *
   * Scope: only the window scroll offset is preserved. Scroll positions of
   * nested `overflow` containers are not.
   */
  preserveScroll?: boolean
  /**
   * An Effect Layer providing services shared by the fresh-boot Flags Effect
   * and every Command and Subscription. The runtime builds the Layer once,
   * the first time it is needed: at startup when a fresh boot supplies Flags
   * (they resolve before `init`) or Subscriptions (their pipelines run for the
   * application's lifetime), otherwise when the first Command runs. The
   * built services are reused for the application's lifetime and released
   * at runtime teardown.
   *
   * Put a service here when it is a genuine app-wide singleton: when
   * construction is expensive relative to how often Commands need it (an
   * RPC client rebuilt on every invocation), or when every Command must
   * share one instance (an AudioContext whose oscillators feed one audio
   * graph, an RTCPeerConnection). A Layer that fails to build crashes the
   * app with the crash view: the runtime provides this Layer to every
   * Command, so a service that cannot be constructed leaves no Command
   * safe to run. The one exception is a Layer that fails while Flags are
   * resolving and the Flags Effect needs it: that lands before the first
   * render, where there is no Model to render a crash view against, so
   * startup fails instead. Neither cause is swallowed, so a Flags Effect
   * that fails for its own unrelated reason stays visible alongside the
   * build error.
   *
   * Provide a service inside the Command's Effect instead when
   * construction is cheap and stateless (an HTTP client via `foldkit/http`
   * is a thin `fetch` wrapper), when different Commands want different
   * implementations of the same tag (`KeyValueStore` over localStorage in
   * one Command and sessionStorage in another), or when a service that can
   * fail to construct should only take down the Commands that use it. An
   * HTTP client can graduate here once many Commands share one configured
   * client, but it starts per-Command.
   */
  resources?: Layer.Layer<Resources>
  /**
   * Model-driven resources with acquire/release lifecycle. Unlike `resources`
   * which persist for the application's lifetime, Managed Resources are
   * acquired and released based on the current model state. Create with
   * `ManagedResource.make`, compose child Submodels with `ManagedResource.lift`,
   * and combine records with `ManagedResource.aggregate`.
   */
  managedResources?: ManagedResources<Model, Message, ManagedResourceServices>
  devTools?: DevToolsConfig
}>

export type FlagsSchemaConfig<Flags> = Readonly<{
  // Flags decode synchronously, on hydration through `decodeUnknownSync` and
  // across HMR through the sync Model/Flags codec, so the codec must require no
  // decode or encode services. The `never` service parameters also make a full
  // application config assignable to the experimental server render input, which
  // needs the same guarantee to serialize Flags without an app context.
  Flags: Schema.Codec<Flags, any, never, never>
}>

export type BootMode = 'Fresh' | 'Hydrate'

/** A configured Foldkit runtime returned by `makeApplication` or `makeElement`.
 *  Pass it to `run` to start a page-owning app, or to `embed` to start it under
 *  a host-controlled lifecycle handle. `ports` is the Ports record from the
 *  config (or `undefined` when the config declared none); it types the
 *  `EmbedHandle` that `embed` returns. `Flags` and `Resources` carry the
 *  fresh-boot requirements from `makeApplication` to `run` and `embed`; they
 *  have no runtime representation.
 */
export type MakeRuntimeReturn<
  P extends Ports | undefined = undefined,
  Flags = void,
  Resources = never,
  Kind extends 'Application' | 'Element' = 'Application' | 'Element',
> = Readonly<{
  runtimeId: string
  start: (hmrModel?: unknown) => Effect.Effect<void>
  ports: P
  '~foldkit/RuntimeBoot'?: Readonly<{
    Flags: (flags: Flags) => Flags
    Resources: (resources: Resources) => Resources
    Kind: Kind
  }>
}>

type RuntimeInternals = {
  startWith: (
    maybeConnector: Option.Option<HostConnector>,
    hmrModel?: unknown,
    bootMode?: BootMode,
    flags?: Effect.Effect<any, never, any>,
    buildId?: string,
  ) => Effect.Effect<void>
  kind: 'Application' | 'Element'
  isEmbedActive: boolean
  maybeActiveFiber: Option.Option<Fiber.Fiber<void>>
}

export const runtimeInternals = new WeakMap<object, RuntimeInternals>()

export const makeRuntime = <
  Model,
  Message,
  Flags,
  Resources,
  ManagedResourceServices,
  P extends Ports | undefined,
  Kind extends 'Application' | 'Element',
>({
  ports,
  kind,
  Model,
  Flags: FlagsCodec,
  configuredFlags,
  isFlagsRequired,
  init,
  update,
  view,
  manageDocument,
  subscriptions,
  container,
  hydration,
  routing: routingConfig,
  crash,
  slow,
  viewTransition,
  freezeModel,
  preserveScroll,
  resources,
  managedResources,
  devTools,
}: RuntimeConfig<
  Model,
  Message,
  Flags,
  Resources,
  ManagedResourceServices,
  P,
  Kind
>): MakeRuntimeReturn<P, Flags, Resources, Kind> => {
  const isSlowVisible = (show: Visibility): boolean =>
    isVisible(show, !!import.meta.hot)

  const htmlBuilder = htmlBuilderFor<Message>()

  const resolvedSlow = __resolveSlowConfig(slow, isSlowVisible)

  const resolvedSlowView = Option.flatMap(resolvedSlow, ({ view }) => view)
  const resolvedSlowUpdate = Option.flatMap(
    resolvedSlow,
    ({ update }) => update,
  )
  const resolvedSlowPatch = Option.flatMap(resolvedSlow, ({ patch }) => patch)
  const resolvedSlowSubscriptionDependencies = Option.flatMap(
    resolvedSlow,
    ({ subscriptionDependencies }) => subscriptionDependencies,
  )

  // NOTE: detection sits inside the flatMap so it runs only for applications
  // that configured the option. Resolved eagerly it would read
  // `document.startViewTransition` and call `window.matchMedia` during
  // `makeRuntime`, which otherwise touches no DOM global at construction.
  const maybeResolvedViewTransition: Option.Option<
    ResolvedViewTransition<Model, Message>
  > = pipe(
    Option.fromNullishOr(viewTransition),
    Option.flatMap(decide =>
      Option.map(__resolveStartViewTransition(), startViewTransition => ({
        decide,
        startViewTransition,
        reducedMotionQuery: window.matchMedia(
          '(prefers-reduced-motion: reduce)',
        ),
      })),
    ),
  )

  const isFreezeModelActive = freezeModel !== false && !!import.meta.hot

  const isPreserveScrollActive =
    preserveScroll !== false && manageDocument && !!import.meta.hot

  const duplicateIdScanner = import.meta.hot
    ? createDuplicateIdScanner()
    : undefined

  const maybeFreezeModel = (model: Model): Model =>
    isFreezeModelActive ? deepFreeze(model) : model

  if (Predicate.isNotUndefined(ports)) {
    validatePorts(ports)
  }

  const runtimeId =
    hydration !== undefined && hydration.runtimeId !== ''
      ? hydration.runtimeId
      : (container?.id ?? '')

  const startWith = (
    maybeConnector: Option.Option<HostConnector>,
    hmrModel?: unknown,
    bootMode: BootMode = 'Fresh',
    bootFlags?: Effect.Effect<Flags, never, Resources>,
    buildId?: string,
  ): Effect.Effect<void> => {
    // NOTE: one notifier per runtime, provided across the whole runtime
    // Effect so Commands, Subscriptions, and Mount-forked Effects all resolve
    // the same signal. A commit in one embedded application must never wake a
    // `Render.afterCommit` awaiting inside another.
    const commitNotifier = createCommitNotifier()
    const settlePendingCommit = (): void => {
      if (commitNotifier.service.isCommitPending()) {
        commitNotifier.notifyCommitted()
      }
    }

    return Effect.scoped(
      Effect.gen(function* () {
        if (runtimeId === '') {
          return yield* Effect.die(
            new Error(
              '[foldkit] Runtime container must have an `id` for HMR model preservation. ' +
                'Set `container.id = "app"` (or any unique string) before passing it to makeApplication or makeElement. ' +
                'On a server-rendered page the id comes from the `data-foldkit-app` root stamp instead.',
            ),
          )
        }

        // NOTE: every perpetual fiber (for example, Subscription streams
        // and ManagedResource lifecycles) and every Command fiber forks
        // into the runtime scope, so interrupting the runtime fiber (what
        // dispose does) interrupts them all and runs their finalizers. A
        // detached fork would outlive the runtime.
        const runtimeScope = yield* Effect.scope

        const maybePortChannels: Option.Option<PortChannelsBundle> = pipe(
          Option.fromNullishOr(ports),
          Option.map(portsConfig =>
            makePortChannels(portsConfig, maybeConnector),
          ),
        )

        yield* Option.match(
          Option.all({
            connector: maybeConnector,
            portChannels: maybePortChannels,
          }),
          {
            onNone: () => Effect.void,
            onSome: ({ connector, portChannels }) =>
              Effect.acquireRelease(
                Effect.sync(() => connector.bind(portChannels.deliverInbound)),
                () => Effect.sync(() => connector.unbind()),
              ),
          },
        )

        const { managedResourceRefs, provideAllResources, provideResources } =
          yield* makeResourceProvider({
            resources,
            managedResources,
            runtimeScope,
            maybePortChannels,
          })

        // NOTE: One boundary registry per runtime instance, shared
        // across renders so Submodel wrap descriptors registered by
        // h.submodel persist between renders. The render function calls
        // `beginHtmlRender` at the start of each pass; wraps for
        // unmounted Submodels (e.g. an entry removed from a list) are
        // dropped from the registry via snabbdom destroy hooks attached
        // by `h.submodel` to each child vnode.
        const boundaryRegistry: BoundaryRegistry = createHtmlBoundaryRegistry()

        const maybeResolveFreshFlags = Option.orElse(
          Option.fromNullishOr(bootFlags),
          () => configuredFlags,
        )

        const resolveFreshFlags: Effect.Effect<Flags> = Option.match(
          maybeResolveFreshFlags,
          {
            onNone: () =>
              isFlagsRequired
                ? Effect.die(
                    new Error(
                      '[foldkit] This application declares Flags. Pass its ' +
                        'Flags Effect to Runtime.run or Runtime.embed.',
                    ),
                  )
                : /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
                  Effect.succeed(undefined as Flags),
            onSome: provideResources,
          },
        )

        // Every hydration refusal that knows which root it was going to adopt
        // contains that root first. The build id is one reason to refuse; a
        // missing, duplicated, malformed, or Schema-incompatible Flags payload
        // is another, and the page left behind is just as live in each case.
        const refuseHydration = <A>(
          root: Element,
          message: string,
          cause?: unknown,
        ): Effect.Effect<A> => {
          containRefusedPage(root.ownerDocument)
          return Effect.die(
            cause === undefined
              ? new Error(message)
              : new Error(message, { cause }),
          )
        }

        const decodeFlagsPayload = (
          payload: string,
          runtimeId: string,
          root: Element,
        ): Effect.Effect<Flags> =>
          Effect.try({
            try: () => {
              const parsedPayload: unknown = JSON.parse(payload)
              return pipe(
                /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
                Schema.toCodecJson(FlagsCodec as Schema.Codec<Flags>),
                Schema.decodeUnknownSync,
                decode => decode(parsedPayload),
              )
            },
            catch: cause => cause,
          }).pipe(
            Effect.catch(cause =>
              refuseHydration<Flags>(
                root,
                '[foldkit] Runtime.hydrate could not decode the server ' +
                  `Flags payload for application "${runtimeId}". The HTML ` +
                  'and client bundle must use the same Flags Schema.',
                cause,
              ),
            ),
          )

        const maybeRequestedHydration =
          bootMode === 'Hydrate'
            ? Option.fromNullishOr(hydration)
            : Option.none<HydrationConfig>()

        if (bootMode === 'Hydrate' && Option.isNone(maybeRequestedHydration)) {
          // A hydrating client that finds no stamped root will not adopt
          // whatever the page holds, so the page is contained whether or not the
          // caller named a container.
          containRefusedPage(
            container === null ? document : container.ownerDocument,
          )
          return yield* Effect.die(
            new Error(
              '[foldkit] Runtime.hydrate could not find a server-rendered ' +
                `root stamped with \`${FOLDKIT_APP_ATTRIBUTE}\`. Use ` +
                'Runtime.run for a fresh client boot.',
            ),
          )
        }

        // The build the served page came from is settled here, before the Flags
        // payload text is accessed, parsed, or decoded, before `init` runs, and
        // therefore before any Command, Subscription, ManagedResource, or port
        // this boot would start. A page from another deployment carries that
        // deployment's Flags, which the current Schema may well accept while
        // every value in them means something else, so deferring the comparison
        // to the DOM patch lets stale data reach new code that already acted on
        // it.
        if (Option.isSome(maybeRequestedHydration)) {
          const skew = buildSkew(
            maybeRequestedHydration.value.root,
            buildId,
            maybeRequestedHydration.value.runtimeId,
          )
          if (skew !== undefined) {
            containRefusedPage(maybeRequestedHydration.value.root.ownerDocument)
            return yield* Effect.die(skew)
          }
        }

        // NOTE: an HMR-restored Model wins over DOM adoption because the
        // server DOM reflects older code. The hydration handoff is still
        // required, but the restored Model gets a fresh patch against its
        // stamped root.
        const maybeHydrationRoot: Option.Option<HTMLElement> =
          Predicate.isUndefined(hmrModel)
            ? Option.map(
                maybeRequestedHydration,
                requestedHydration => requestedHydration.root,
              )
            : Option.none()

        const maybeHydrationFlags: Option.Option<Flags> = yield* Option.match(
          maybeRequestedHydration,
          {
            onNone: () => Effect.succeed(Option.none()),
            onSome: requestedHydration =>
              Effect.map(
                requestedHydration.isFlagsRequired
                  ? Array.match(requestedHydration.flagsScripts, {
                      onEmpty: () =>
                        refuseHydration(
                          requestedHydration.root,
                          '[foldkit] Runtime.hydrate found application ' +
                            `"${requestedHydration.runtimeId}" but its ` +
                            'server Flags payload is missing.',
                        ),
                      onNonEmpty: ([payloadScript, ...remainingScripts]) =>
                        Array.isArrayNonEmpty(remainingScripts)
                          ? refuseHydration(
                              requestedHydration.root,
                              '[foldkit] Runtime.hydrate found multiple ' +
                                'server Flags payloads for application ' +
                                `"${requestedHydration.runtimeId}".`,
                            )
                          : decodeFlagsPayload(
                              payloadScript.textContent ?? '',
                              requestedHydration.runtimeId,
                              requestedHydration.root,
                            ),
                    })
                  : /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
                    Effect.succeed(undefined as Flags),
                Option.some,
              ),
          },
        )

        const resolveFlags: Effect.Effect<Flags> = Option.match(
          maybeHydrationFlags,
          {
            onNone: () => resolveFreshFlags,
            onSome: Effect.succeed,
          },
        )

        const ModelJsonCodec = Schema.toCodecJson(
          /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
          Model as Schema.Codec<Model>,
        )
        const decodeHmrModel = Schema.decodeUnknownExit(ModelJsonCodec)
        const encodeHmrModel = Schema.encodeUnknownSync(ModelJsonCodec)

        const currentUrl: Option.Option<Url> = Option.fromNullishOr(
          routingConfig,
        ).pipe(Option.flatMap(() => urlFromString(window.location.href)))

        type InitResult = ReturnType<typeof init>

        // NOTE: a restored Model skips `init`, so resolving Flags on that
        // path would build the `resources` Layer only to discard what it
        // produced. Gating the resolution on the restore decision is what
        // stops a reload from reconnecting whatever the Layer holds. It has
        // to stay ahead of the preserve-scheduler and HMR finalizers: a
        // Flags Effect that fails after those are registered tears down more
        // than it used to, and their release defects would bury its cause.
        const runInit: Effect.Effect<InitResult> = Effect.map(
          resolveFlags,
          flags => init(flags, Option.getOrUndefined(currentUrl)),
        )

        const init_ = yield* hmrModel !== undefined
          ? Exit.match(decodeHmrModel(hmrModel), {
              onFailure: () => runInit,
              onSuccess: restoredModel =>
                Effect.succeed<InitResult>({ model: restoredModel }),
            })
          : runInit
        const initModelRaw = init_.model
        const initCommands = init_.commands ?? []

        // NOTE: keep `encodeHmrModel` off the dispatch hot path. It walks
        // the entire Model graph (O(modelSize) per call) and blocks input
        // on large Models. The scheduler defers encoding to a quiet window
        // and the `vite:beforeFullReload` flush covers the HMR boundary.
        const PRESERVE_DEBOUNCE = Duration.millis(200)
        const preserveScheduler = yield* makePreserveScheduler<Model>(
          {
            onDebounce: model =>
              Effect.sync(() =>
                preserveModel(runtimeId, encodeHmrModel(model), false),
              ),
            onFlush: model =>
              Effect.sync(() =>
                preserveModel(runtimeId, encodeHmrModel(model), true),
              ),
          },
          PRESERVE_DEBOUNCE,
        )

        const hot = import.meta.hot
        if (hot) {
          yield* Effect.acquireRelease(
            Effect.sync(() => {
              // NOTE: Effect.runSync requires `flush` to have no async
              // suspensions. The scheduler is built to satisfy that: flush
              // clears pending atomically and runs `onFlush` without
              // interrupting the in-flight timer fiber, which keeps the
              // whole effect synchronous. If a future change adds an async
              // step (interrupt-await, sleep, fork) on this path, Vite may
              // race ahead to location.reload() before the encoded model
              // reaches the plugin.
              const handler = (): void => {
                Effect.runSync(preserveScheduler.flush)
              }
              hot.on('vite:beforeFullReload', handler)
              return handler
            }),
            handler =>
              Effect.sync(() => hot.off('vite:beforeFullReload', handler)),
          )
          yield* Effect.addFinalizer(() => preserveScheduler.cancel)
        }

        if (hot && isPreserveScrollActive) {
          yield* Effect.acquireRelease(
            Effect.sync(() => {
              const handler = (): void => preserveScrollPosition(runtimeId)
              hot.on('vite:beforeFullReload', handler)
              return handler
            }),
            handler =>
              Effect.sync(() => hot.off('vite:beforeFullReload', handler)),
          )
        }

        const schedulePreserveModel = (model: Model): Effect.Effect<void> =>
          hot ? preserveScheduler.schedule(model) : Effect.void

        const status = makeRuntimeStatus()

        // NOTE: `processMessagePlain` and `crashWith` are defined further
        // down, so they are wrapped here instead of passed by reference. The
        // queue has to exist before the navigation listeners attach below,
        // and reading a `const` before its line has run throws.
        const {
          enqueueMessage,
          enqueueMessageEffect,
          drainPendingMessages,
          resetDrainBudget,
          completeBoot,
        } = yield* makeMessageQueue<Message>({
          status,
          processMessage: message => processMessagePlain(message),
          crashWith: (cause, maybeMessage) => crashWith(cause, maybeMessage),
        })

        // NOTE: `isRenderFrameScheduled` clears when the frame callback
        // starts, which on the View Transition path is before the patch runs.
        // `commitNotifier` tracks the patch itself, so `Render.afterCommit`
        // waits for the commit rather than for the frame that scheduled it.
        let isRenderFrameScheduled = false
        // NOTE: resume clears the DevTools store's pause flag before its frame
        // patches the live view. This distinguishes that intentional repaint
        // from an ordinary frame that was already queued when jumpTo installed
        // the historical view.
        let isLiveViewRestorePending = false

        const initModel = maybeFreezeModel(initModelRaw)

        const modelPubSub = yield* PubSub.unbounded<Model>()
        const {
          mountTracker,
          mountRuntime,
          drainMountEvents,
          readViewState,
          setViewState,
          isPausedNow,
          installDevToolsStore,
          resumeDevTools,
          recordInit,
          recordMessage,
          attachRenderedMounts,
        } = yield* makeDevToolsIntegration<Model, Message>({
          devTools,
          update,
          maybeFreezeModel,
          enqueueMessageEffect,
        })

        if (import.meta.hot) {
          yield* Effect.addFinalizer(() =>
            Effect.sync(() => duplicateIdScanner?.cancel()),
          )
        }

        if (routingConfig) {
          yield* Effect.acquireRelease(
            Effect.sync(() =>
              addNavigationEventListeners(enqueueMessage, routingConfig),
            ),
            removeNavigationEventListeners =>
              Effect.sync(() => removeNavigationEventListeners()),
          )
        }

        // NOTE: the model and the current vnode are plain closure state.
        // The hot path reads and writes them directly; the cold paths that
        // run inside Effects (crash rendering, the dispose finalizer, the
        // replay render) read the same variables synchronously, so no Ref
        // is needed.
        let liveModel: Model = initModel
        // NOTE: the Model behind the DOM currently on screen, which is what a
        // View Transition animates away from. Seeded with `initModel` because
        // the init render paints it, and advanced only where a render actually
        // commits. The `viewTransition` predicate never runs before a Message
        // has dirtied the Model, and the init render completes behind the boot
        // barrier, so this is always the model of a paint that happened.
        let lastRenderedModel: Model = initModel

        // NOTE: the transition the browser is still animating, if any. Held so
        // the runtime can skip it: when a later frame supersedes it, when the
        // runtime crashes, and at teardown, where the browser would otherwise
        // animate over a released container. Declared above `crashWith`, which
        // calls the skip and can run as early as the init render.
        type PendingViewTransition = Readonly<{
          handle: ViewTransitionHandle
          update: {
            isInvalidated: boolean
            didRun: boolean
          }
        }>
        let maybePendingViewTransition = Option.none<PendingViewTransition>()

        const skipPendingViewTransition = (): void => {
          if (Option.isSome(maybePendingViewTransition)) {
            const { value: pendingViewTransition } = maybePendingViewTransition
            // NOTE: cleared first. An implementation that runs the update
            // callback synchronously would otherwise re-enter this.
            maybePendingViewTransition = Option.none()
            pendingViewTransition.update.isInvalidated = true
            try {
              pendingViewTransition.handle.skipTransition()
            } catch {
              // NOTE: skipping runs on teardown and crash paths, so a refusal
              // must not propagate into them.
            }
          }
        }

        const vnodeSlot: VNodeSlot = { maybeCurrentVNode: Option.none() }

        const patchRuntimeVNode = (
          maybeCurrentVNode: Option.Option<VNode>,
          nextVNode: VNode | null,
          seen?: Set<object>,
        ): VNode => {
          try {
            return __patchVNode(
              maybeCurrentVNode,
              nextVNode,
              container,
              seen,
              patchedVNode => {
                vnodeSlot.maybeCurrentVNode = Option.some(patchedVNode)
              },
            )
          } catch (error) {
            try {
              const maybeRecoveryVNode = vnodeSlot.maybeCurrentVNode
              if (Option.isSome(maybeRecoveryVNode)) {
                vnodeSlot.maybeCurrentVNode = Option.some(
                  __recoverVNodeAfterPatchFailure(maybeRecoveryVNode.value),
                )
              }
            } finally {
              flushReplayUnmountsAfterPatchFailure()
            }
            throw error
          }
        }

        // NOTE: consumed by the first render only. Set when this boot found
        // an adoptable server-rendered root; the first patch then goes
        // through `__hydrateVNode` instead of replacing the container.
        let pendingHydrationRoot: HTMLElement | null =
          Option.getOrNull(maybeHydrationRoot)

        // NOTE: registered before any perpetual fiber is forked so it runs
        // after they are interrupted (scope finalizers are LIFO). Patching to
        // an empty tree fires snabbdom destroy hooks, which is what releases
        // Mounts; swapping the placeholder for the original container leaves
        // the host DOM as it was before the first render, ready for a fresh
        // embed of the same container. Gated on interruption: that is the
        // dispose path. A runtime that stops because it crashed completes
        // normally after rendering the crash view, and the crash view must
        // stay visible.
        yield* Effect.addFinalizer(exit =>
          Effect.gen(function* () {
            if (!Exit.hasInterrupts(exit)) {
              return
            }
            const maybeCurrentVNode = vnodeSlot.maybeCurrentVNode
            yield* Option.match(maybeCurrentVNode, {
              onNone: () => Effect.void,
              onSome: currentVNode =>
                Effect.sync(() => {
                  const placeholderNode = __patchVNode(
                    Option.some(currentVNode),
                    null,
                    container,
                  ).elm
                  if (placeholderNode && placeholderNode.parentNode) {
                    placeholderNode.parentNode.replaceChild(
                      container,
                      placeholderNode,
                    )
                    container.replaceChildren()
                  }
                }),
            })
          }),
        )

        // NOTE: shared by every crash path: the init render, the plain
        // message drain and render frame (which reach it through
        // `Effect.runFork` from their catch blocks), and the Command and
        // Subscription fibers (a Command's Effect and a Subscription's
        // Stream are typed with a `never` error channel, so a cause
        // escaping one can only be a `resources` Layer build failure or an
        // escaped defect, both unrecoverable). Each path catches its own
        // cause so a failure surfaces as the crash view instead of dying
        // silently and leaving the DOM frozen at the last successful
        // render. The first crash wins: concurrent Command fibers can fail
        // on the same broken Layer, and only one should report and render.
        const crashWith = (
          cause: Cause.Cause<never>,
          maybeMessage: Option.Option<Message>,
        ): Effect.Effect<void> =>
          Effect.sync(() => {
            if (status.isCrashed) {
              return
            }
            status.isCrashed = true
            // NOTE: the crash view should appear at once, not animate in from
            // a snapshot of the state that crashed.
            skipPendingViewTransition()
            const model = liveModel
            const squashed = Cause.squash(cause)
            const error =
              squashed instanceof Error ? squashed : new Error(String(squashed))
            renderCrashView(
              { error, model, message: maybeMessage },
              crash,
              container,
              vnodeSlot,
              manageDocument,
            )
            settlePendingCommit()
          })

        let maybeLastDirtyMessage = Option.none<Message>()

        const dispatchSync = (message: unknown): void => {
          /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
          enqueueMessage(message as Message)
        }

        const dispatchAsync = (message: unknown): Effect.Effect<void> =>
          /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
          enqueueMessageEffect(message as Message)

        const dispatch = { dispatchAsync, dispatchSync }

        // NOTE: the fork is deferred one microtask so a Command's Effect
        // never begins on the dispatching stack. Commands are facts from
        // outside the update loop; their results always arrive
        // asynchronously, exactly as under the old queue. The fork runs
        // through `Effect.runForkWith` (which starts its fiber
        // synchronously, so the child is registered in `runtimeScope`
        // before this callback returns), not `Effect.runSyncWith`:
        // `runSyncWith` injects a temporary synchronous scheduler into the
        // fiber context, the child would inherit it, and every later yield
        // in the Command (for example, an op-budget suspension, or a
        // Stream step) would
        // reschedule through clamped `setTimeout` instead of the browser
        // microtask scheduler carried by `runtimeContextForCommands`.
        const forkCommand = (
          command: AnyCommand<
            Message,
            never,
            Resources | ManagedResourceServices
          >,
          message: Option.Option<Message>,
        ): void => {
          queueMicrotask(() => {
            // NOTE: `isCrashed` as well as `isRuntimeDisposed`. A crash is
            // terminal but does not dispose the runtime, and a Command forked
            // by a Message processed just before the crashing Message sits in
            // this microtask when the crash view paints. Without the crash
            // check its effect would run behind the crash view, contradicting
            // the crash-terminality contract. `crashWith` sets `isCrashed`
            // synchronously, so it is already set by the time this runs.
            if (status.isRuntimeDisposed || status.isCrashed) {
              return
            }
            Effect.runForkWith(runtimeContextForCommands)(
              Effect.forkIn(runtimeScope)(
                command.effect.pipe(
                  Effect.withSpan(command.name, {
                    attributes: command.args ?? {},
                  }),
                  provideAllResources,
                  Effect.flatMap(enqueueMessageEffect),
                  Effect.catchCause(cause => crashWith(cause, message)),
                ),
              ),
            )
          })
        }

        const processMessagePlain = (message: Message): void => {
          const currentModel = liveModel

          const [messageUpdate, maybeUpdateDuration] = measureSlowPhase(
            resolvedSlowUpdate,
            () => update(currentModel, message),
          )
          const nextModelRaw = messageUpdate.model
          const commands = messageUpdate.commands ?? []
          const nextModel = maybeFreezeModel(nextModelRaw)

          reportSlowPhase<SlowUpdateContext<Model, Message>>(
            resolvedSlowUpdate,
            maybeUpdateDuration,
            (durationMs, thresholdMs) => ({
              _tag: 'Update',
              previousModel: currentModel,
              nextModel,
              message,
              durationMs,
              thresholdMs,
            }),
          )

          if (currentModel !== nextModel) {
            liveModel = nextModel
            maybeLastDirtyMessage = Option.some(message)
            PubSub.publishUnsafe(modelPubSub, nextModel)
            if (import.meta.hot) {
              Effect.runSync(schedulePreserveModel(nextModel))
            }
            scheduleRenderFrame()
          }

          if (!Array.isReadonlyArrayEmpty(commands)) {
            for (const command of commands) {
              forkCommand(
                /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
                command as AnyCommand<
                  Message,
                  never,
                  Resources | ManagedResourceServices
                >,
                Option.some(message),
              )
            }
          }

          recordMessage(message, currentModel, nextModel, commands)
        }

        // NOTE: callers set `isRenderingFrame` before calling this and clear
        // it after. Without it, a Message dispatched while the patch is still
        // running would run update against a half-patched DOM. For a replay,
        // `render` also calls `beginReplayHtmlRender` first, so the old
        // tree's unmount callbacks don't dispatch into live history.
        const renderSync = (
          model: Model,
          maybeMessage: Option.Option<Message>,
          dispatchService: typeof Dispatch.Service,
          renderContext: Context.Context<never>,
          renderMode: RenderMode,
        ): void => {
          const maybeLiveRender = Option.liftPredicate(
            renderMode,
            mode => mode === 'Live',
          )
          const maybeLiveSlowView = Option.flatMap(
            maybeLiveRender,
            () => resolvedSlowView,
          )
          const maybeLiveSlowPatch = Option.flatMap(
            maybeLiveRender,
            () => resolvedSlowPatch,
          )
          const [nextDocument, maybeViewDuration] = measureSlowPhase(
            maybeLiveSlowView,
            () => {
              beginHtmlRender(boundaryRegistry)
              setHtmlRuntime(
                dispatchService.dispatchSync,
                renderContext,
                boundaryRegistry,
                renderMode,
              )

              try {
                return view(model, htmlBuilder)
              } finally {
                clearHtmlRuntime()
              }
            },
          )
          const { body: nextVNode } = nextDocument

          reportSlowPhase<SlowViewContext<Model, Message>>(
            maybeLiveSlowView,
            maybeViewDuration,
            (durationMs, thresholdMs) => ({
              _tag: 'View',
              model,
              message: maybeMessage,
              durationMs,
              thresholdMs,
            }),
          )

          const { maybeCurrentVNode } = vnodeSlot

          const [patchedVNode, maybePatchDuration] = measureSlowPhase(
            maybeLiveSlowPatch,
            () => {
              if (
                Option.isNone(maybeCurrentVNode) &&
                pendingHydrationRoot !== null
              ) {
                const hydrationRoot = pendingHydrationRoot
                pendingHydrationRoot = null
                // NOTE: strip the stamp before the patch, not after, so the
                // patch is the sole owner of the root's attributes. It has
                // already served its purpose of locating the root, and
                // removing it after would delete a `data-foldkit-app` the view
                // itself declares, which a later equal-vnode patch would not
                // restore. Removing it here also stops a later boot on the same
                // container (a dispose-then-embed remount) from re-detecting
                // this now-consumed root as hydratable.
                hydrationRoot.removeAttribute(FOLDKIT_APP_ATTRIBUTE)
                // An empty id reaches the adoption step's own check as a
                // value that matches nothing. Boot already refused a
                // hydration without an id, so this stands in only for a
                // caller that reached here another way.
                return __hydrateVNode(
                  hydrationRoot,
                  nextVNode,
                  boundaryRegistry.dedupeSeen,
                  buildId ?? '',
                )
              }
              return patchRuntimeVNode(
                maybeCurrentVNode,
                nextVNode,
                boundaryRegistry.dedupeSeen,
              )
            },
          )
          vnodeSlot.maybeCurrentVNode = Option.some(patchedVNode)

          reportSlowPhase<SlowPatchContext<Model, Message>>(
            maybeLiveSlowPatch,
            maybePatchDuration,
            (durationMs, thresholdMs) => ({
              _tag: 'Patch',
              model,
              message: maybeMessage,
              durationMs,
              thresholdMs,
            }),
          )

          if (manageDocument) {
            applyDocumentMetadata(nextDocument, patchedVNode.elm)
          }

          if (import.meta.hot) {
            duplicateIdScanner?.schedule(patchedVNode.elm)
          }
        }

        // NOTE: `dispatchService` defaults to live dispatch but is overridable
        // so a time-travel render can bind both declarative handlers and newly
        // acquired Mounts to `noOpDispatch`. A live Mount keeps its dispatcher
        // across replay, while a replay-created Mount stays muted until a live
        // resume patch releases it and starts the live action. This preserves
        // valid async results from live Mounts without granting a historical
        // acquisition access to the live Model.
        const render = (
          model: Model,
          maybeMessage: Option.Option<Message>,
          dispatchService: typeof Dispatch.Service = dispatch,
          renderMode: RenderMode = 'Live',
        ) =>
          Effect.gen(function* () {
            status.isRenderingFrame = true
            const runtimeContext = yield* Effect.context<never>()
            if (renderMode === 'Replay') {
              beginReplayHtmlRender()
            }
            renderSync(
              model,
              maybeMessage,
              dispatchService,
              runtimeContext,
              renderMode,
            )
          }).pipe(
            Effect.ensuring(
              Effect.sync(() => {
                status.isRenderingFrame = false
                endReplayHtmlRender()
                drainPendingMessages()
              }),
            ),
            Effect.provideService(Dispatch, dispatchService),
            Effect.provideService(MountTracker, mountTracker),
            Effect.provideService(MountRuntime, mountRuntime),
          )

        yield* installDevToolsStore({
          // NOTE: passes `noOpDispatch` so declarative handlers and Mounts
          // acquired by the replay cannot reach the live Model. Their
          // fibers stay alive and can observe view-state changes while the
          // historical view owns them. If resume reuses such an element,
          // OnMount releases the replay acquisition before starting the
          // live action. Also discards mount events fired during the render
          // so they don't get attributed to the next user-initiated dispatch.
          renderReplay: model =>
            Effect.gen(function* () {
              /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
              const replayedModel = model as Model
              const previousRenderedModel = lastRenderedModel
              // NOTE: a Mount surviving from the live view must observe
              // Paused before the historical patch can expose different
              // DOM. Mounts inserted by that patch capture this state when
              // acquired, so asynchronous setup cannot skip Paused even if
              // it consumes the Stream only after the live view returns.
              setViewState('Paused')
              // NOTE: a transition still animating belongs to the live
              // state this replay is about to paint over. Left running it
              // animates a dead snapshot across the replayed DOM.
              skipPendingViewTransition()
              const replayRenderExit = yield* Effect.exit(
                render(replayedModel, Option.none(), noOpDispatch, 'Replay'),
              )
              if (Exit.isFailure(replayRenderExit)) {
                drainMountEvents()
                if (isPausedNow()) {
                  // NOTE: the failed patch may already have changed the
                  // DOM. Repaint the Model at the store's previous paused
                  // index before returning the failure. If that Model no
                  // longer renders either, resume the store so its normal
                  // live frame becomes the single recovery path.
                  const rollbackExit = yield* Effect.exit(
                    render(
                      previousRenderedModel,
                      Option.none(),
                      noOpDispatch,
                      'Replay',
                    ),
                  )
                  drainMountEvents()
                  if (Exit.isFailure(rollbackExit)) {
                    yield* resumeDevTools
                  }
                } else {
                  // NOTE: a failed first jump leaves the store live. Keep
                  // Mounts Paused through the recovery patch, which
                  // publishes Live only after the live DOM is restored.
                  yield* Effect.sync(() => scheduleRenderFrame(true))
                }
                return yield* Effect.failCause(replayRenderExit.cause)
              }
              drainMountEvents()
              // NOTE: a replay paints a past Model, so it owns the DOM on
              // screen until the next live frame. Leaving
              // `lastRenderedModel` on the pre-pause Model would hand the
              // `viewTransition` predicate a `previousModel` describing a
              // DOM that no longer exists, and the frame `resume`
              // schedules would animate the wrong direction out of the
              // wrong snapshot.
              lastRenderedModel = replayedModel
              // NOTE: the Message that dirtied the pre-pause frame does not
              // describe this repaint. Clearing it means the frame `resume`
              // schedules renders plainly, matching the documented rule
              // that time-travel never animates.
              maybeLastDirtyMessage = Option.none()
            }),
          // NOTE: `resume` calls this after a jumpTo render attached DOM
          // listeners to `noOpDispatch`. Scheduling a frame renders the
          // live model with live dispatch and rebinds listeners.
          markRenderPending: Effect.sync(() => scheduleRenderFrame(true)),
        })

        const initRenderExit = yield* Effect.exit(
          render(initModel, Option.none()),
        )
        if (Exit.isFailure(initRenderExit)) {
          yield* crashWith(initRenderExit.cause, Option.none())
          // NOTE: suspend instead of returning. Completing would close the
          // runtime scope and tear down the crash view; the scope must stay
          // open until the runtime is interrupted (an embedded app's dispose)
          // or the document goes away.
          return yield* Effect.never
        }

        if (isPreserveScrollActive) {
          yield* restorePreservedScrollPosition(runtimeId)
        }

        yield* recordInit(initModel, initCommands)

        // NOTE: maybeLastDirtyMessage holds the most recent dirtying
        // Message, so slow render-phase callbacks during high-rate bursts attribute
        // to the last Message in the frame batch, not the specific one that
        // pushed the view past threshold. Acceptable for a debug callback;
        // full attribution would require correlating each message with its
        // render contribution, which isn't worth the complexity.

        // NOTE: render frames run as plain JavaScript inside the
        // requestAnimationFrame callback. Messages arriving between frames
        // mark at most one pending frame; the callback renders once with the
        // latest model. The runtime context for OnMount forking and Command
        // forking is captured once here; it is constant for the lifetime of
        // the runtime.
        const runtimeContextForCommands = yield* Effect.context<never>()
        const liveRenderContext = Context.add(
          Context.add(
            Context.add(runtimeContextForCommands, Dispatch, dispatch),
            MountTracker,
            mountTracker,
          ),
          MountRuntime,
          mountRuntime,
        )

        // NOTE: the render, Mount drain, DevTools attribution, and
        // patch-time-buffer flush. Shared by the plain path (called directly)
        // and the View Transition path (called from the transition's update
        // callback), which run identical work; only whether they run inside
        // `document.startViewTransition` differs. `isRenderingFrame` gates the
        // buffering of Messages dispatched by patch-time hooks, so it must
        // wrap the actual patch, which on the transition path happens inside
        // the callback, not when the frame is scheduled.
        const runRenderFrameBody = (): void => {
          status.isRenderingFrame = true
          // NOTE: captured before the patch, because `drainPendingMessages`
          // below can advance `liveModel` again before the next frame reads
          // it. What this frame painted is what the next transition animates
          // away from.
          const renderedModel = liveModel
          const isResuming = readViewState() === 'Paused'
          if (isResuming) {
            // NOTE: Messages accumulated while a historical view owned the DOM
            // did not cause this repaint. A Message arriving during the patch
            // can repopulate this field when the buffered queue drains.
            maybeLastDirtyMessage = Option.none()
          }
          try {
            renderSync(
              liveModel,
              maybeLastDirtyMessage,
              dispatch,
              liveRenderContext,
              'Live',
            )
            // NOTE: after the patch, so a render that threw leaves this on the
            // Model still on screen, and before `drainPendingMessages` below,
            // whose handlers can advance `liveModel` again.
            lastRenderedModel = renderedModel
            // NOTE: resume clears the store's pause flag before this frame.
            // Publish Live only after the live DOM has been installed.
            setViewState('Live')
            attachRenderedMounts()
          } catch (error) {
            Effect.runFork(crashWith(Cause.die(error), maybeLastDirtyMessage))
          } finally {
            status.isRenderingFrame = false
          }
          // NOTE: Messages dispatched by patch-time hooks (for example,
          // OnUnmount destroys, or Mount emissions) were buffered while the
          // frame held the stack; they process now, after the patch has
          // committed and the frame's Mount events are attributed.
          drainPendingMessages()
          // NOTE: last, so a waiter resumed by the commit observes the same
          // DOM and the same processed-Message ordering it saw when
          // `afterCommit` counted frames.
          settlePendingCommit()
        }

        // NOTE: starts a View Transition around this frame's render when the
        // `viewTransition` predicate matches, returning `true` when it did.
        // `startViewTransition` invokes its update callback asynchronously
        // after snapshotting the old DOM, so the callback reads `liveModel`
        // and `maybeLastDirtyMessage` fresh (the plain loop may have advanced
        // the model while the browser suppressed rendering) and re-checks the
        // disposal and crash guards, which can flip while the transition is
        // pending. The unconfigured path never reaches this function; the
        // `Option.isNone` check in `renderFramePlain` returns first, so a
        // runtime without `viewTransition` allocates no per-frame callback.
        const startFrameViewTransition = (
          resolved: ResolvedViewTransition<Model, Message>,
        ): boolean => {
          if (readViewState() === 'Paused') {
            return false
          }
          if (resolved.reducedMotionQuery.matches) {
            return false
          }
          if (Option.isNone(maybeLastDirtyMessage)) {
            return false
          }
          const maybeDecision = __decideViewTransition(resolved.decide, {
            previousModel: lastRenderedModel,
            model: liveModel,
            message: maybeLastDirtyMessage.value,
          })
          if (Option.isNone(maybeDecision)) {
            return false
          }
          // NOTE: invalidate an older transition before this one takes
          // ownership of the latest live repaint. The browser may still call
          // the older update callback, but its invalidation guard leaves the
          // DOM and commit notifier to this transition.
          skipPendingViewTransition()
          try {
            const update = {
              isInvalidated: false,
              didRun: false,
            }
            const handle = resolved.startViewTransition(() => {
              if (update.isInvalidated || update.didRun) {
                return
              }
              update.didRun = true
              // NOTE: the view state closes the resume window after the
              // store is live but before its plain frame has restored the live
              // DOM. A transition invalidated by jumpTo stays invalid forever,
              // so its callback cannot repaint inside the stale transition
              // even if it arrives after resume has published `Live`.
              if (
                status.isRuntimeDisposed ||
                status.isCrashed ||
                isPausedNow() ||
                readViewState() === 'Paused'
              ) {
                settlePendingCommit()
                return
              }
              runRenderFrameBody()
            }, maybeDecision.value.maybeTypes)
            maybePendingViewTransition = Option.some({ handle, update })
            __silenceViewTransitionRejections(handle)
            return true
          } catch {
            // NOTE: an escaping throw would leave the rAF callback without a
            // patch and without settling the commit notifier, parking every
            // `Render.afterCommit` on this frame forever.
            return false
          }
        }

        // NOTE: every path out of a scheduled frame settles the commit
        // notifier, whether or not it patched. A frame abandoned silently
        // would strand any `Render.afterCommit` registered against it, and
        // the Dom helpers that gate on it would never run their DOM work.
        const renderFramePlain = (): void => {
          isRenderFrameScheduled = false
          const isRestoringLiveView = isLiveViewRestorePending
          isLiveViewRestorePending = false
          // NOTE: a frame scheduled before disposal fires after it; a
          // disposed runtime must not repaint the released container.
          if (status.isRuntimeDisposed) {
            settlePendingCommit()
            return
          }
          // NOTE: a frame is running, so the browser got control back; the
          // drain budget starts fresh.
          resetDrainBudget()
          // NOTE: a Message that dirtied the model can also be the one
          // whose Command crashed the runtime. Without this guard the
          // next animation frame would render the live view over the
          // crash view.
          if (status.isCrashed) {
            settlePendingCommit()
            return
          }
          if (isPausedNow()) {
            settlePendingCommit()
            return
          }
          if (readViewState() === 'Paused' && !isRestoringLiveView) {
            settlePendingCommit()
            return
          }
          // NOTE: the unconfigured path pays one `Option.isNone` check and
          // renders directly, allocating no per-frame callback. Only a
          // runtime configured with `viewTransition` reaches
          // `startFrameViewTransition`, which decides per frame whether to
          // wrap the render in `document.startViewTransition`. When it does,
          // the render runs later, inside the transition's update callback.
          if (Option.isNone(maybeResolvedViewTransition)) {
            runRenderFrameBody()
            return
          }
          if (!startFrameViewTransition(maybeResolvedViewTransition.value)) {
            runRenderFrameBody()
          }
        }

        const scheduleRenderFrame = (
          isRestoringLiveView: boolean = false,
        ): void => {
          if (isRestoringLiveView) {
            isLiveViewRestorePending = true
          }
          if (isRenderFrameScheduled) {
            return
          }
          isRenderFrameScheduled = true
          commitNotifier.markCommitPending()
          requestAnimationFrame(renderFramePlain)
        }

        if (subscriptions) {
          yield* forkSubscriptionFibers({
            subscriptions,
            initModel,
            modelPubSub,
            runtimeScope,
            maybeSlowSubscriptionDependencies:
              resolvedSlowSubscriptionDependencies,
            enqueueMessageEffect,
            provideAllResources,
            crashWith,
          })
        }

        yield* forkManagedResourceFibers({
          managedResourceRefs,
          initModel,
          modelPubSub,
          runtimeScope,
          enqueueMessageEffect,
          crashWith,
        })

        // NOTE: registered before the boot buffer drains, so an interrupt
        // landing anywhere after this yield tears down with the flag set
        // (finalizers are LIFO; this one runs before every
        // earlier-registered teardown, including the container-restoring
        // patch whose OnUnmount dispatches must be dropped). An interrupt
        // landing before this yield tears down with isBootComplete still
        // false, so every dispatch buffers and dies with the closure.
        // Either way no Message is processed against a closing runtime.
        yield* Effect.addFinalizer(() =>
          Effect.sync(() => {
            status.isRuntimeDisposed = true
            // NOTE: a transition outliving the runtime would keep animating
            // over a container the teardown is about to restore.
            skipPendingViewTransition()
          }),
        )

        // NOTE: init Commands fork as the last act of boot, exactly where
        // the old queue's drain loop used to start. Together with the
        // isBootComplete barrier this guarantees no Command result (or any
        // other Message) is processed until the init render has painted
        // initModel and every boot subsystem (DevTools store, Subscriptions,
        // ManagedResources, ports) is attached. forkCommand also defers each
        // start by a microtask, so a fully synchronous init Command still
        // delivers its result asynchronously.
        for (const command of initCommands) {
          forkCommand(
            /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
            command as AnyCommand<
              Message,
              never,
              Resources | ManagedResourceServices
            >,
            Option.none(),
          )
        }

        completeBoot()

        // NOTE: suspend forever. Messages are processed synchronously on
        // the dispatching stack and render frames run as plain rAF
        // callbacks, so this fiber's only remaining job is keeping the
        // runtime scope open until interruption (an embedded app's dispose)
        // or the document goes away.
        yield* Effect.never
      }),
    ).pipe(Effect.provideService(RenderCommit, commitNotifier.service))
  }

  const start = (hmrModel?: unknown): Effect.Effect<void> =>
    startWith(Option.none(), hmrModel, 'Fresh')

  const program: MakeRuntimeReturn<P, Flags, Resources, Kind> = {
    runtimeId,
    start,
    ports,
  }
  runtimeInternals.set(program, {
    startWith: (maybeConnector, hmrModel, bootMode, flags, buildId) =>
      startWith(maybeConnector, hmrModel, bootMode, flags, buildId),
    kind,
    isEmbedActive: false,
    maybeActiveFiber: Option.none(),
  })
  return program
}
