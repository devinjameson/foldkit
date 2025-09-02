# URL Building

## Current State

We currently use manual URL string building for route construction, which is error-prone and not type-safe.

## Future Goal

Add URL building functionality to the Route module, similar to Elm's `Url.Builder`. This would allow:

```typescript
// Instead of:
const url = `/people?searchText=${encodeURIComponent(value)}`

// We could do:
const url = Route.buildUrl(peopleRouteParser, { searchText: Option.some(value) })
```

## Benefits

- Type safety: can't build URLs with wrong parameter names/types
- Automatic encoding of URL parameters
- Consistency with route parsing
- Easier refactoring when routes change
- Reversible parsers (parse URL → data, build data → URL)

## Implementation Ideas

- Make route parsers bidirectional (like Elm's URL parsers)
- Add `Route.buildUrl(parser, data)` function
- Consider URL builder combinators like `Route.path(['people']).query({ search: 'value' })`
