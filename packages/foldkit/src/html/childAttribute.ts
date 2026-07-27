import {
  type DispatchSync,
  outerDispatchOrFallback,
  requireBoundaryMappers,
  requireDispatch,
  requireUnmountResolver,
} from './runtimeSingleton.js'

const BRAND = '__childAttribute'

/** An attribute carrying its own dispatcher rather than using the one for the
 *  boundary it is spread into. The runtime routes each handler through the
 *  carried dispatcher at event-fire time, so the element's position in the
 *  tree no longer decides where its messages go.
 *
 *  Created via {@link childAttributes}, which binds the publishing Submodel's
 *  boundary so a child's handler survives being spread into a parent's
 *  element, or {@link rootAttributes}, which binds the app's own dispatcher so
 *  a handler skips every boundary. Element constructors accept
 *  `ChildAttribute` alongside `Attribute<Message>` in their attribute arrays.
 *
 *  `resolveUnmount` snapshots the wrapping chain at the time the group was
 *  published (child boundary alive) so `OnUnmount` can dispatch a root message
 *  from a destroy hook that fires after the boundary has been torn down.
 *  `boundaryMappers` snapshots the same chain as a pure list of
 *  `toParentMessage` lifts (innermost first) so `OnMount` can stamp it on the
 *  mount marker; the Scene test harness folds it to replay the lift. For a
 *  root-bound group there is no chain: the resolver dispatches directly and
 *  the mapper list is empty. */
export type ChildAttribute = Readonly<{
  readonly [BRAND]: true
  readonly attribute: unknown
  readonly dispatch: DispatchSync
  readonly resolveUnmount: (message: unknown) => () => void
  readonly boundaryMappers: ReadonlyArray<(message: unknown) => unknown>
}>

export const isChildAttribute = (value: unknown): value is ChildAttribute =>
  typeof value === 'object' && value !== null && BRAND in value

/** Captures the current boundary's dispatcher and wraps each attribute
 *  so handlers inside it route through that boundary's wrapping chain at
 *  event-fire time, even when the attribute is later spread into a
 *  parent's element in a different boundary.
 *
 *  Submodels call this when publishing attribute groups to a consumer's
 *  `toView` slot callback:
 *
 *  ```ts
 *  // Inside a SubmodelView running in the child's boundary:
 *  return viewInputs.toView({
 *    checkbox: childAttributes([
 *      h.OnClick(Toggled()),
 *      h.Role('checkbox'),
 *    ]),
 *    ...
 *  })
 *  ```
 *
 *  Without this binding step the consumer's element constructor would
 *  process `h.OnClick(Toggled())` using the parent's dispatcher (because
 *  the consumer's `toView` runs in the parent's boundary), bypassing the
 *  Submodel's `toParentMessage`. */
export const childAttributes = <Attribute>(
  attributes: ReadonlyArray<Attribute>,
): ReadonlyArray<ChildAttribute> => {
  const dispatch = requireDispatch()
  const resolveUnmount = requireUnmountResolver()
  const boundaryMappers = requireBoundaryMappers()
  return attributes.map(attribute => ({
    [BRAND]: true,
    attribute,
    dispatch,
    resolveUnmount,
    boundaryMappers,
  }))
}

/** The mirror of {@link childAttributes}. Binds each attribute to the app's own
 *  dispatcher, so its handlers reach `update` unwrapped no matter how many
 *  Submodel boundaries the element is rendered inside.
 *
 *  A handler's dispatcher is chosen by where the element is built, not by the
 *  Message type it carries: `html<Message>()`'s type argument is erased, and
 *  the runtime reads the boundary off the current frame. So a shared view
 *  helper that constructs an app-level Message works at the root and breaks
 *  inside a Submodel, where the boundary's `toParentMessage` is applied to it.
 *  That wrapper is a Schema constructor, so it rejects the foreign Message and
 *  throws inside the event listener: nothing is dispatched, no `update` runs,
 *  and the only signal is an uncaught error in the console. Nothing catches it
 *  at compile time. This makes the intent explicit instead:
 *
 *  ```ts
 *  // A shared copy button, rendered on plain pages and inside Submodels alike:
 *  h.button(
 *    [h.AriaLabel(label), ...rootAttributes([h.OnClick(ClickedCopy({ text }))])],
 *    [Icon.copy()],
 *  )
 *  ```
 *
 *  Reach for this only when a Submodel renders app-level chrome it does not
 *  own, such as a copy button, an analytics hook, or a toast trigger. When a
 *  Submodel reports something about itself, that is an OutMessage, and routing
 *  it past the parent breaks the encapsulation the boundary exists to provide.
 *
 *  `OnUnmount` messages resolve straight to the root dispatcher, and the
 *  `boundaryMappers` chain is empty, both matching the absence of any lift. */
export const rootAttributes = <Attribute>(
  attributes: ReadonlyArray<Attribute>,
): ReadonlyArray<ChildAttribute> => {
  const dispatch = outerDispatchOrFallback()
  return attributes.map(attribute => ({
    [BRAND]: true,
    attribute,
    dispatch,
    resolveUnmount: message => () => dispatch(message),
    boundaryMappers: [],
  }))
}
