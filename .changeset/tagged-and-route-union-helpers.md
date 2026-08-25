---
'foldkit': minor
'@foldkit/ui': minor
'@foldkit/devtools': minor
'@foldkit/oxlint-plugin': minor
'create-foldkit-app': minor
---

Replace `r` with `defineRouteUnion`, add `defineTaggedUnion`, and rename `ts` to `taggedStruct`. Every union now declares itself from one record of fields per variant, the way `defineMessageUnion` already did for Messages, instead of naming each variant once as a constructor and again in the union list.

`defineRouteUnion` lives in `foldkit/route`, `defineTaggedUnion` and `taggedStruct` live in `foldkit/schema`. Each union is a Schema carrying one callable constructor per variant plus exhaustive `match`. Routes and domain unions also carry `guards` and `isAnyOf`, which Message unions do not: a Message union is closed and handled exhaustively, while a Route union is routinely tested a few tags at a time.

## Migrate Routes

Declare every route in one record and reach each variant through the union. Name the union `AppRoute`, not `Route`, which is the Foldkit route module.

Before:

```typescript
import { int, literal, mapTo, r, root, slash } from 'foldkit/route'

export const HomeRoute = r('Home')
export const PersonRoute = r('Person', { personId: S.Number })
export const NotFoundRoute = r('NotFound', { path: S.String })

export const AppRoute = S.Union([HomeRoute, PersonRoute, NotFoundRoute])

export type HomeRoute = typeof HomeRoute.Type
export type PersonRoute = typeof PersonRoute.Type
export type NotFoundRoute = typeof NotFoundRoute.Type
export type AppRoute = typeof AppRoute.Type

export const homeRouter = pipe(root, mapTo(HomeRoute))
export const personRouter = pipe(
  literal('people'),
  slash(int('personId')),
  mapTo(PersonRoute),
)

export const urlToAppRoute = parseUrlWithFallback(routeParser, NotFoundRoute)
```

After:

```typescript
import {
  defineRouteUnion,
  int,
  literal,
  mapTo,
  root,
  slash,
} from 'foldkit/route'

export const AppRoute = defineRouteUnion({
  Home: {},
  Person: { personId: S.Number },
  NotFound: { path: S.String },
})
export type AppRoute = typeof AppRoute.Type

export const homeRouter = pipe(root, mapTo(AppRoute.Home))
export const personRouter = pipe(
  literal('people'),
  slash(int('personId')),
  mapTo(AppRoute.Person),
)

export const urlToAppRoute = parseUrlWithFallback(
  routeParser,
  AppRoute.NotFound,
)
```

The `XxxRoute` suffix existed to disambiguate a flat namespace. The union namespace does that job now, so drop it: `AppRoute.Person({ personId: 42 })` where you wrote `PersonRoute({ personId: 42 })`.

## Migrate a Submodel's sub-union

A page Submodel that owns part of the route tree takes an `S.Union` of the variants it handles. That stays an `S.Union`, now over the parent union's variants.

Before:

```typescript
export const LoggedOutRoute = S.Union([HomeRoute, LoginRoute, NotFoundRoute])
export const LoggedInRoute = S.Union([
  DashboardRoute,
  SettingsRoute,
  NotFoundRoute,
])
```

After:

```typescript
export const LoggedOutRoute = S.Union([
  AppRoute.Home,
  AppRoute.Login,
  AppRoute.NotFound,
])
export const LoggedInRoute = S.Union([
  AppRoute.Dashboard,
  AppRoute.Settings,
  AppRoute.NotFound,
])
```

List a sub-union's members rather than deriving it by subtracting from the parent. Subtraction reverses who decides: a route added to the parent joins every derived subset that did not name it, so the website's docs section would start claiming new top-level pages on its own.

When a child module needs one variant's type, export an alias for it beside the union. The variant's own type is `typeof AppRoute.Person.Type`, which is worth naming once rather than repeating:

```typescript
export type PersonRoute = typeof AppRoute.Person.Type
```

## Replace hand-written route guards

`isAnyOf` narrows over several tags, so a guard that listed them by hand becomes one line.

Before:

```typescript
export const isBlogRoute = (
  route: AppRoute,
): route is BlogRoute | BlogPostRoute =>
  route._tag === 'Blog' || route._tag === 'BlogPost'
```

After:

```typescript
export const isBlogRoute = AppRoute.isAnyOf(['Blog', 'BlogPost'])
```

## Migrate domain unions

`defineTaggedUnion` replaces a group of `ts` declarations that fed one `S.Union` in the same module.

Before:

```typescript
import { ts } from 'foldkit/schema'

export const NotSubmitted = ts('NotSubmitted')
export const Submitting = ts('Submitting')
export const SubmitSuccess = ts('SubmitSuccess')
export const SubmitError = ts('SubmitError', { error: S.String })

export const Submission = S.Union([
  NotSubmitted,
  Submitting,
  SubmitSuccess,
  SubmitError,
])
export type Submission = typeof Submission.Type
```

After:

```typescript
import { defineTaggedUnion } from 'foldkit/schema'

export const Submission = defineTaggedUnion({
  NotSubmitted: {},
  Submitting: {},
  Succeeded: {},
  Failed: { error: S.String },
})
export type Submission = typeof Submission.Type
```

Exhaustive dispatch is `match`, so an Effect `Match` chain over the union's own tags becomes shorter:

```typescript
// Before
M.value(submission).pipe(
  M.withReturnType<Html>(),
  M.tagsExhaustive({ ... }),
)

// After
Submission.match<Html>(submission, { ... })
```

`match` is a runtime call, so a view that previously type-imported its Model now needs a value import for the union. Effect `Match` remains available for partial matching, fallbacks, and one handler shared across several tags.

## Drop the prefix a namespaced tag repeats

A tag no longer has to disambiguate itself against every other binding in the module, so it should not repeat its union's name. `ConnectionState.ConnectionConnected` reads worse than `ConnectionState.Connected` and carries no more information. Renaming a tag changes the value of `_tag`, so leave tags alone where they cross a boundary: a wire protocol, a persisted Model, or a stored URL.

## Rename `ts` to `taggedStruct`

`ts` was short because it appeared everywhere. `defineTaggedUnion` now covers the common case, so the remaining helper is spelled out.

```typescript
// Before
import { ts } from 'foldkit/schema'
const TableRow = ts('TableRow', { cells: S.Array(TableCell) })

// After
import { taggedStruct } from 'foldkit/schema'
const TableRow = taggedStruct('TableRow', { cells: S.Array(TableCell) })
```

Reach for `taggedStruct` only where a single record cannot express the shape. For example: a union whose variants reference the union itself (`Canvas.Shape`, the markdown AST), a union whose variants each belong to a different module (a parent Model assembled from two Submodel Models), a struct that is a child of another struct rather than a variant of a choice (`TableRow`), and a variant built inside a generic Schema factory (`AsyncData`). A module forced onto `taggedStruct` by recursion keeps its sibling unions on `taggedStruct` too, so one module has one spelling.

## Variants are no longer separate exports

Two Foldkit modules exported their union's variants as top-level names. Both now expose the union only.

```typescript
// Before
Navigation.Internal({ url })
Interruptible.Interrupted()

// After
Navigation.UrlRequest.Internal({ url })
Interruptible.Outcome.Interrupted()
```

The DevTools protocol module does the same: `Request`, `Response`, `Event`, `DiffValue`, and `MessageSchemaResult` replace the individual variant exports. Their `_tag` values are unchanged, so a DevTools client and an application on either side of this release still understand each other.

## Constrain a helper to no-field variants

`NoFields<Tag>` in `foldkit/schema` is a no-field variant's constructor, whatever union it belongs to. It accepts `Message.ClickedSave`, `AppRoute.Home`, and a no-field `defineTaggedUnion` variant alike, and rejects any variant that carries fields.

Use it where a helper can only build a variant that carries no data. A router helper for a literal-only path is the usual case: the path parses nothing, so the route it maps to must need nothing.

```typescript
const page = <Tag extends string>(slug: string, route: NoFields<Tag>) =>
  pipe(literal(slug), mapTo(route))

export const roadmapRouter = page('roadmap', AppRoute.Roadmap)
```

Prefer it to writing `CallableTaggedStruct<Tag, {}>` by hand. In TypeScript `{}` means any non-nullish value, so that spelling reads as the opposite of what it does.

## Lint

`@foldkit/oxlint-plugin`'s `no-empty-object-tagged-call` recognized member calls only when the namespace name ended in `Message`. It now covers any union namespace, so `AppRoute.Home({})` and `ConnectionState.Connected({})` are flagged alongside `Message.ClickedSave({})`.

The [Routing & Navigation guide](https://foldkit.dev/core/routing-and-navigation) covers the route union in depth, and the [Model guide](https://foldkit.dev/core/model) covers state modeling with `defineTaggedUnion`.
