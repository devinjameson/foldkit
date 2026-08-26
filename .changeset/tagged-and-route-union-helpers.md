---
'foldkit': minor
'@foldkit/ui': minor
'@foldkit/devtools': minor
'@foldkit/devtools-mcp': minor
'@foldkit/markdown': minor
'@foldkit/oxlint-plugin': minor
'@foldkit/vite-plugin': minor
'create-foldkit-app': minor
---

Routes and other tagged unions now use the same one-object declaration as Messages. The old `r` and `ts` helpers are gone:

- Use `defineRouteUnion` for `AppRoute`.
- Use `defineTaggedUnion` for Model states and other domain unions.
- Use `taggedStruct` when a tagged struct must be declared on its own.

Both union helpers return a Schema that also holds the variant constructors. For example, `AppRoute.Person` is the `Person` Schema, and `AppRoute.Person({ personId: 42 })` constructs a value. They also provide `match`, `guards`, `isAnyOf`, `subset`, and `members`. A `defineTaggedUnion` result can be passed directly to `Machine.define`. Message unions still expose only their constructors and exhaustive `match`.

## Migrate Routes

Declare every route in one `AppRoute` object, then use variants through that namespace. Do not name the union `Route`; Foldkit already uses that name for the route module.

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

The old `XxxRoute` suffix kept separate exports from colliding. `AppRoute` now provides that context, so write `AppRoute.Person({ personId: 42 })` instead of `PersonRoute({ personId: 42 })`.

## Migrate Route subsets

Use `subset` when a Model or Schema accepts only some application Routes. This keeps the allowed Routes tied to `AppRoute` without declaring another union.

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
export const LoggedOutRoute = AppRoute.subset(['Home', 'Login', 'NotFound'])
export const LoggedInRoute = AppRoute.subset([
  'Dashboard',
  'Settings',
  'NotFound',
])
```

`subset` includes only the tags you name. If you add a Route to `AppRoute` later, neither Schema above will accept it until you add its tag. There is no `omit`: an exclusion list would silently accept every Route added later.

If a module needs to name one variant's type, export an alias beside `AppRoute` instead of repeating `typeof AppRoute.Person.Type`:

```typescript
export type PersonRoute = typeof AppRoute.Person.Type
```

## Replace hand-written route guards

Use `isAnyOf` when one guard accepts several tags.

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

Use `defineTaggedUnion` when the variants of a domain union can be declared together.

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
  SubmitSuccess: {},
  SubmitError: { error: S.String },
})
export type Submission = typeof Submission.Type
```

Use the union's `match` method when every tag must be handled:

```typescript
// Before
M.value(submission).pipe(
  M.withReturnType<Html>(),
  M.tagsExhaustive({ ... }),
)

// After
Submission.match<Html>(submission, { ... })
```

Because `match` runs at runtime, a file that calls it must import the union as a value. Keep using Effect `Match` for partial matching, fallbacks, or one handler shared by several tags.

## Remove repeated union names from tags

The union name now provides the context a tag needs. Prefer `ConnectionState.Connected` to `ConnectionState.ConnectionConnected`.

Renaming a tag also changes its `_tag` value. Do not shorten tags stored in a Model, URL, or wire protocol unless that external value is meant to change.

## Rename `ts` to `taggedStruct`

`taggedStruct` is the new name for `ts`. Most unions should move to `defineTaggedUnion`; `taggedStruct` remains for variants that must be declared separately.

```typescript
// Before
import { ts } from 'foldkit/schema'
const TableRow = ts('TableRow', { cells: S.Array(TableCell) })

// After
import { taggedStruct } from 'foldkit/schema'
const TableRow = taggedStruct('TableRow', { cells: S.Array(TableCell) })
```

Use `taggedStruct` in these cases:

- A recursive union, such as `Canvas.Shape` or the markdown AST.
- A union assembled from variants owned by different modules, such as a parent Model built from two Submodel Models.
- A tagged child struct that is not one variant of a choice, such as `TableRow`.
- A variant created inside a generic Schema factory, such as `AsyncData`.

If recursion forces one union in a module to use `taggedStruct`, use `taggedStruct` for the module's sibling unions too.

## Variants are no longer separate exports

`Navigation` and `Interruptible` no longer export their variants as separate top-level names. Access each variant through its union instead.

```typescript
// Before
Navigation.Internal({ url })
Interruptible.Interrupted()

// After
Navigation.UrlRequest.Internal({ url })
Interruptible.Outcome.Interrupted()
```

The DevTools protocol now follows the same rule. Its variants live under `Request`, `Response`, `Event`, `DiffValue`, and `MessageSchemaResult`. The `_tag` strings did not change, so old and new DevTools clients still speak the same wire protocol.

`@foldkit/ui`, `@foldkit/devtools`, `@foldkit/devtools-mcp`, `@foldkit/markdown`, and `@foldkit/vite-plugin` now require Foldkit `>=0.153.0` because their published code calls these new APIs. Each gets a minor release so consumers on older pre-1.0 ranges do not receive an incompatible update.

## Lint

`foldkit/no-empty-object-tagged-call` now catches no-field Route and domain constructors as well as Messages. It recognizes namespaces whose names end in Message, Route, or State, plus unions declared in the same file with Foldkit's union helpers. It does not assume every PascalCase namespace is a Foldkit union.

The [Routing & Navigation guide](https://foldkit.dev/core/routing-and-navigation) covers the route union in depth, and the [Model guide](https://foldkit.dev/core/model) covers state modeling with `defineTaggedUnion`.
