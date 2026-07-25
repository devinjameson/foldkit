# Informing Submodels

## Overview

A Submodel owns its state and describes its state transitions in its own `update`. However, sometimes it has to respond to changes outside its boundary, like the URL changing or a server push it folds into its state. It owns none of these, and they never reach its `update` on their own. So how does a Submodel respond to these changes without leaking into its parent?

The Submodel closes that gap by exposing a helper the parent calls when the change happens. The helper runs the change through the Submodel’s own `update`, so the Submodel derives its new state and returns any Commands the change calls for. The parent only needs to know that one named entry point, not the Submodel’s internal Messages, so the Submodel keeps full control of how it responds.

Conventionally, that helper is an `inform*` helper: the parent informs the child of a change it doesn’t own, and the child decides what that means for its state.

The rest of this page works the `inform*` pattern through routing, its most common case. The example is a `/people` page whose People Submodel holds a search input, a results list, and a list of recent searches. The Submodel does not own the route, so it exposes an `informRouteChanged` helper, and the parent delegates to that helper on every URL change that resolves to a People route.

:::Info{label="Prerequisite"}
This page builds on the [Submodels](/core/submodel) pattern. Read that first if the `Got*Message` wrapping convention is unfamiliar.
:::

## The Child

People declares `ChangedRoute` alongside its other Messages. It carries a `PeopleRoute`: the slice of the App route People handles, not the whole `AppRoute`.

People handles `ChangedRoute` in `update` like any other Message. It reads the new params out of the route, sets the search input to match, records the search in its history, and returns a `FetchPeople` Command so the results match the new query.

`ChangedRoute` itself stays internal. Rather than import and dispatch it, the parent calls `informRouteChanged`, a helper that runs `update(model, ChangedRoute({ route }))`. The People Submodel can change how it handles a route change without the parent knowing.

::Snippet{name="informingSubmodelsChild" label="child code"}

:::Warning{label="Not an OutMessage"}
`ChangedRoute` flows from parent to child. It is a normal child Message that the parent triggers through `informRouteChanged`, not a fact the child surfaces upward. The [OutMessage](/core/submodel#surfacing-facts) pattern goes the other way.
:::

## The Parent

The parent’s `ChangedUrl` handler resolves the URL into a route, stores it on `model.route`, then branches on the route tag. When the new route is one a Submodel handles, the parent calls that Submodel’s `informRouteChanged` and lifts the result the way it lifts any child update: the next child Model goes into its slice, and the child Commands map into `GotPeopleMessage`. The `ChangedUrl` branch and the `GotPeopleMessage` branch read almost the same, because both just run People’s `update` and lift what comes back.

::Snippet{name="informingSubmodelsParent" label="parent code"}

:::Info{label="Multiple Submodels"}
When several Submodels each handle different routes, give `ChangedUrl` one `M.tag` arm per Submodel. Each arm calls the `informRouteChanged` helper of the Submodel that handles that route.
:::

:::Warning{label="Cold loads"}
`informRouteChanged` only runs when the URL changes, and a cold load is not a change. The parent’s `init` parses the initial URL and calls the Submodel’s `init(route)`, which seeds the route-derived state and returns the boot Commands the route calls for. See [Cold Loads and the Initial Route](/core/routing-and-navigation#cold-loads).
:::

The [Routing example](/example-apps/routing) has the full implementation: a controlled search input, an async-fetched results list, and a recent-searches list, all kept in step with the URL. The [Routing & Navigation](/core/routing-and-navigation) guide covers the route parser the parent uses to turn URLs into the routes this page assumes.

Routing is the common case, but not the only one. Whether a change reaches the parent through the router, a [Subscription](/core/subscriptions), or a [Command](/core/commands), a Submodel that has to respond to it exposes the same kind of helper. The question is always the same: does the Submodel own the value, or only need to hear that it changed?
