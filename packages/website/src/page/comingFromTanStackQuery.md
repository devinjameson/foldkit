# Coming from TanStack Query

TanStack Query is excellent at what it does. If you are coming from it, you are used to caching, background refetching, deduplication, and retries arriving as configuration on a hook. Foldkit has no `useQuery`, and it does not need one. This page shows where each piece of that behavior lives instead.

The short version: the value `useQuery` returns and the machinery it runs are two different things, and Foldkit treats them differently. The value is shipped. [AsyncData](/core/async-data) is a six-state union that makes loading, failure, stale-while-revalidate, and keep-stale-on-failure first-class states of the data itself, with named transitions between them. The machinery is not shipped, because here it is not machinery. When to fetch, when to refetch, and what counts as stale are decisions you write with the same primitives you already use for everything else: Model state, the `update` function, Commands, and Subscriptions.

TanStack Query bundles both halves into the hook, with the policy arriving as configuration (`staleTime`, `refetchOnWindowFocus`, and the rest), so a lot happens that you did not write and cannot see. Foldkit ships the state machine every app shares and asks you to write the policy that differs per app. The trade is not more code or less. It is hidden machinery versus code you can read.

## Translating Concepts

Here is how the TanStack Query model maps onto Foldkit:

| TanStack Query                                             | Foldkit                                                                                       |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `useQuery`                                                 | An [AsyncData](/core/async-data) field in the Model plus a fetch Command                      |
| `data` / `error` / `status` / `fetchStatus`                | The six `AsyncData` states, mapped below                                                      |
| Query cache (keyed by query key)                           | Model state: one `AsyncData` field, or an `S.HashMap` of them keyed by id                     |
| `placeholderData: keepPreviousData` / stale data on screen | `Refreshing` and `Stale`: states that hold the previous data                                  |
| `staleTime` / background refetch                           | A Subscription gated on a Model condition, applying `AsyncData.revalidate`                    |
| `staleTime: Infinity`                                      | `AsyncData.loadIfMissing`: fetch on first visit, then keep the cache without revalidating     |
| Request deduplication                                      | `AsyncData.revalidateOrLoad` yields `None` while a request is in flight                       |
| Out-of-order response handling                             | The request context threaded through the result Message, judged against the Model in `update` |
| `invalidateQueries`                                        | `AsyncData.revalidateOrLoad` plus the fetch Command, returned from `update`                   |
| `useMutation`                                              | A Message and a Command, the same as any other effect                                         |
| Retries                                                    | Effect’s `retry` / `Schedule`                                                                 |
| TanStack Query Devtools                                    | [Foldkit DevTools](/core/devtools): inspect the Model and step through every Message          |

## Async State Is Model State

A query has states: loading, success, error, and often a “refreshing with stale data on screen” state. TanStack Query hands them to you as flags on the query object. In Foldkit they are a shipped value type, `AsyncData<A, E>`, a union of six states: `Idle`, `Loading`, `Refreshing`, `Failure`, `Stale`, and `Success`. `Refreshing` and `Stale` are the two that hold the previous good data: `Refreshing` while a refetch is in flight, which is stale-while-revalidate, and `Stale` after a refetch failed, which keeps the data on screen instead of blanking it to an error.

There is no separate cache. The Model is the cache. A single resource lives in one `AsyncData` field; a collection of resources keyed by id lives in an `S.HashMap` of them. Reading from cache is reading the Model, and rendering instantly from cache is just rendering the data you already hold.

Here is `useQuery` translated whole. One field, one Command, two `update` arms:

::Snippet{name="useQueryTranslation" label="useQuery translation"}

Each runtime behavior of `useQuery` is one visible line. `revalidateOrLoad` returning `None` while a request is in flight is request deduplication. `Success` moving to `Refreshing` is cache-and-revalidate, with the current list staying on screen. A cold field starting `Loading` is the initial fetch. And `settle` folding the finished `Result` into the field is response handling, keeping the previous data as `Stale` when a refresh fails instead of blanking the screen.

The [API Cache example](/example-apps/api-cache) builds the rest of what TanStack Query gives you (a keyed cache with instant hits, invalidation, background polling) out of nothing but a Model, an `update` function, Commands, and one Subscription. It is worth reading top to bottom.

## Mapping Query Status

If you know TanStack Query’s status flags, you already know the six states. Each one is a combination of flags and data presence on the query object, promoted to a variant:

| TanStack Query                                                           | AsyncData                |
| ------------------------------------------------------------------------ | ------------------------ |
| Disabled or not yet started (`status: 'pending'`, `fetchStatus: 'idle'`) | `Idle`                   |
| `isLoading` (first fetch, no data yet)                                   | `Loading`                |
| `isRefetching && data !== undefined`                                     | `Refreshing({ data })`   |
| `isError && data === undefined`                                          | `Failure({ error })`     |
| `isError && data !== undefined`                                          | `Stale({ error, data })` |
| `isSuccess && !isFetching`                                               | `Success({ data })`      |

The difference is who tracks the combinations. In TanStack Query, “failed but still holding data” is a derived condition you check with `isError && data !== undefined`, and nothing reminds you to. Here it is a variant, `Stale`, and `AsyncData.match` does not compile until you say what it renders. When a view does not care which data-holding state it is in, `matchData` collapses the six states into three channels: data, failure, empty.

:::Warning{label="isPending means something different"}
TanStack Query’s `isPending` means the first fetch has not finished: no data, no error yet. `AsyncData.isPending` means a request is in flight: true for `Loading` and `Refreshing`, the analog of TanStack Query’s `isFetching`. And `Stale` is not pending. Its fetch already failed; it is holding data, not waiting.
:::

## Out-of-Order Responses

`AsyncData` tells you what state a field is in. It does not, and cannot, order the responses that arrive to fill it. Here is a bug that is easy to hit. Fire a request for A, then fire a request for B before A returns. A is slow, B is fast, so B resolves first, then A resolves last and overwrites it. Now you are showing A’s data when the user asked for B.

Foldkit does not auto-cancel in-flight effects, and there is no ordering guarantee between independent requests, so this is reachable. You handle it the same way TanStack Query does internally: track what the Model currently wants and ignore any response that is not it. Thread the query through the Command into the result Message, and in `update` discard any result whose query no longer matches the Model:

::Snippet{name="responseRaceGuard" label="response race guard"}

The late response for an earlier query sees that its `query` no longer matches `queryInput` and is dropped. The newest query stays on screen. Everything around the guard is the standard shape: the Command settles the fetch into a `Result`, and `AsyncData.settle` folds it into the field. The comparison uses data the Model already holds; there is no synthetic request counter to maintain.

This snippet also shows where `keepPreviousData` went. `UpdatedQuery` transitions the field to `Loading`, which blanks the previous results while the new query runs. To keep them on screen instead, transition to `Refreshing({ data })` when the field holds data. Blank-and-load versus keep-while-loading is one visible line in `update`, not a configuration flag.

:::Info{label="This is the solution, not a workaround"}
It is tempting to read the guard as boilerplate you tolerate until something better comes along. It is not. The behavior you want, newest request wins, has to live somewhere. Here it lives in update as a comparison against the Model you can read and test. That visibility is the point, not a tax on it. The shape generalizes: tag each async result with what the Model wanted when you started it, then ignore any result that no longer matches. The same few lines that resolve this fetch race also resolve a debounced search box firing on every keystroke, because the question is identical: is this result still the one the Model is waiting for?
:::

Judging at receipt is the correctness layer, and it is never optional. There is a second, situational layer: when the superseded request is worth stopping, because the fetch is expensive or the user gets a Cancel button, define the Command with an `interrupt` field and dispatch its `Interrupt` Command to stop the in-flight work explicitly. The guard stays either way: a result can already be in the queue when the interrupt lands. See [Interrupting Commands](/core/commands#interrupting-commands).

## FAQ

### Where is useQuery? {#faq-where-is-usequery}

There isn’t one, and you don’t assemble an equivalent hook. A query is an [AsyncData](/core/async-data) field in the [Model](/core/model) plus a [Command](/core/commands) returned from `update`. The runtime runs the effect and feeds the result back as a Message, and `AsyncData.settle` folds it into the field. The “query” is spread across those pieces on purpose, so each one stays visible.

### How do I cache responses? {#faq-caching}

Keep the data in the Model. For a single resource that is one `AsyncData` field; for many resources, an `S.HashMap` of them keyed by id. A cache hit is a field where `AsyncData.hasData` is true, rendered without firing a Command. See the [API Cache example](/example-apps/api-cache).

### How do I deduplicate identical requests? {#faq-dedup}

In `update`, decide the transition with `AsyncData.revalidateOrLoad`. While a request is in flight (`Loading` or `Refreshing`) it yields `None`, so you make no transition and return no Command. Because every request starts as a decision made in one place, not firing twice is a branch, not a feature. Note this is a different thing from out-of-order handling above: dedup avoids starting redundant work, the judgment in `update` resolves work that finishes out of order.

### What about keepPreviousData? {#faq-keep-previous-data}

Pick the transition yourself when the input changes. `Loading` drops the old data; `Refreshing({ data })` keeps it on screen while the new request runs. TanStack Query’s helper (passed as `placeholderData` in v5) is that same decision made for you. Here it is one line you choose in `update`.

### How do I poll or refetch in the background? {#faq-polling}

Use a [Subscription](/core/subscriptions) gated on a Model condition. It starts the interval when the condition becomes true and tears it down when it becomes false, with no manual cleanup. On each tick, apply `AsyncData.revalidate` and return the fetch Command when it yields a transition: `Success` and `Stale` move to `Refreshing`, so the old numbers stay on screen while the new ones load, and a tick that lands during an in-flight request starts nothing. The API Cache example refetches stats on a timer exactly this way.

### How do I invalidate and refetch? {#faq-invalidate}

Apply `AsyncData.revalidateOrLoad` to the field, and when it yields a transition, return the fetch Command from `update`. `Success` and `Stale` move to `Refreshing`, so the current data stays on screen while the new request runs, and a cold or failed field restarts a fresh `Loading`. That is the same cache-and-revalidate behavior you are used to, expressed as an explicit state transition. When the response arrives, `settle` folds it in, keeping the old data as `Stale` if the refresh failed. The narrower `revalidate` skips fields that hold nothing, which is the right transition after a mutation touches caches that may never have loaded.

### What about mutations? {#faq-mutations}

A mutation is a Message and a Command, the same as any other effect. The button dispatches a Message, `update` returns a Command that performs the write, and the result comes back as another Message you handle. In that handler you do what `onSuccess` plus `invalidateQueries` would have done: revalidate the affected fields, or edit the cached data in place with `AsyncData.map`, the `setQueryData` move.

### How do I do optimistic updates? {#faq-optimistic-updates}

Apply the edit to the Model immediately with `AsyncData.map` in the same `update` arm that fires the mutation Command, and handle the failure Message by putting the previous value back or revalidating. TanStack Query’s `onMutate` / `onError` / `onSettled` rollback dance becomes ordinary update logic: the optimistic write, the rollback value, and the recovery path are all plain state transitions you can read and test.

### Why write this yourself instead of letting a library do it? {#faq-own-the-behavior}

Foldkit does ship the part that is the same in every app: `AsyncData` is the state machine for a value that arrives asynchronously, and `settle`, `revalidate`, and friends are its transitions. What it does not ship is the policy: when to fetch, what counts as stale, which fields a mutation invalidates. That logic is logic your app depends on, and keeping it as state and transitions you own means you can read it, test it, and change it. A hook that decides for you owns that logic instead, and the day your case diverges from its defaults you are reaching for configuration and hoping the knob you need exists. Owning the policy is not the cost of this approach. It is the point of it.

The [Async Data](/core/async-data) page covers the module itself: the Schema builder, the `match` family, and combining several fields into one screen with `all`. If you are also coming from React, [Coming from React](/react/coming-from-react) covers the rest of the mental model: components, hooks, effects, and how they map onto Foldkit.
