# Routing

**Status**: Next to implement  
**Context**: Enable multi-page applications with client-side routing

## Problem

Foldkit currently only supports single-page applications. To build larger applications, we need:

- Client-side routing (SPA navigation)
- URL-based state management
- Browser history integration (back/forward buttons)
- Link navigation without page refreshes
- Route parameters and query strings

## Elm's Approach

Elm provides "batteries included" routing with `Browser.application`:

```elm
main =
    Browser.application
        { init = init
        , view = view
        , update = update
        , subscriptions = subscriptions
        , onUrlChange = UrlChanged      -- Framework handles history API
        , onUrlRequest = LinkClicked    -- Framework handles link clicks
        }

-- User defines route parsing
type Route
    = Home
    | Profile String
    | Settings
    | NotFound

-- Route parsing
routeParser : Parser (Route -> a) a
routeParser =
    Parser.oneOf
        [ Parser.map Home Parser.top
        , Parser.map Profile (Parser.s "profile" </> Parser.string)
        , Parser.map Settings (Parser.s "settings")
        ]
```

## Proposed foldkit Solution

### Enhanced makeApp API

```typescript
// Route definitions
type Route = Data.TaggedEnum<{
  Home: {}
  Profile: { username: string }
  Settings: {}
  NotFound: {}
}>

// Model includes current route
type Model = Readonly<{
  route: Route
  // Page-specific state
  homeModel: HomeModel
  profileModel: ProfileModel
  settingsModel: SettingsModel
}>

// URL changes become messages
type Message = Data.TaggedEnum<{
  UrlChanged: { url: string }
  NavigateTo: { route: Route }
  // Page messages
  HomeMessage: { msg: HomeMsg }
  ProfileMessage: { msg: ProfileMsg }
}>

// Enhanced makeApp with routing
const app = makeApp({
  init,
  update,
  view,
  container: document.body,

  // Routing configuration - foldkit handles browser APIs
  routing: {
    onUrlChange: (url: string) => Message.UrlChanged({ url }),
    onNavigate: (route: Route) => Message.NavigateTo({ route }),
    parseRoute: (url: string) => Route, // User-defined URL → Route
    routeToUrl: (route: Route) => string, // User-defined Route → URL
  },
})
```

### What foldkit handles internally

- `history.pushState` / `history.replaceState` calls
- `popstate` event listeners for browser back/forward
- Initial URL parsing on application startup
- Link click interception for SPA navigation
- Preventing full page reloads for internal links

### What the user provides

- Route type definitions (tagged unions)
- URL parsing logic (`parseRoute` function)
- Route serialization (`routeToUrl` function)
- Message constructors for URL changes
- View logic based on current route

## Route-based View Rendering

```typescript
const view = (model: Model): Html => {
  return div(
    [Class('app')],
    [
      navbar(model.route), // Pass current route for active states

      // Main content based on route
      Route.$match(model.route, {
        Home: () => homeView(model.homeModel),
        Profile: ({ username }) => profileView(model.profileModel, username),
        Settings: () => settingsView(model.settingsModel),
        NotFound: () => notFoundView(),
      }),
    ],
  )
}

// Navigation with route awareness
const navbar = (currentRoute: Route): Html =>
  nav(
    [Class('navbar')],
    [
      navLink('Home', Route.Home(), currentRoute),
      navLink('Settings', Route.Settings(), currentRoute),
    ],
  )

const navLink = (text: string, route: Route, currentRoute: Route): Html => {
  const isActive = Route.$is(route._tag)(currentRoute)
  const className = isActive ? 'nav-link active' : 'nav-link'

  return a([Class(className), OnClick(Message.NavigateTo({ route }))], [text])
}
```

## Update Function Handling

```typescript
const update = fold<Model, Message>({
  UrlChanged: pure((model, { url }) => ({
    ...model,
    route: parseRoute(url),
  })),

  NavigateTo: pureCommand((model, { route }) => [
    { ...model, route },
    navigateCommand(route), // foldkit-provided command
  ]),

  // Page-specific updates (flat for now, nested later)
  HomeMessage: pure((model, { msg }) => ({
    ...model,
    homeModel: homeUpdate(model.homeModel, msg),
  })),
})
```

## Implementation Details

### Core routing functions

```typescript
// foldkit provides these internally
const navigateCommand = (route: Route): Command<Message> =>
  makeCommand(
    Effect.sync(() => {
      const url = routeToUrl(route)
      history.pushState({}, '', url)
      return Message.UrlChanged({ url })
    }),
  )

// Set up browser event listeners
const setupRouting = (onUrlChange: (url: string) => Message) => {
  // Handle popstate (back/forward buttons)
  window.addEventListener('popstate', () => {
    onUrlChange(window.location.pathname)
  })

  // Handle link clicks
  document.addEventListener('click', (e) => {
    // Intercept internal links, prevent external links
  })
}
```

### Route parsing with combinators

Following Elm's approach, foldkit provides URL parsing combinators:

```typescript
// Route parsing with functional combinators
const parseRoute = Route.oneOf([
  Route.map(Route.top, Route.Home),                                    // matches "/"
  Route.map(Route.s('profile', Route.string), Route.Profile),         // matches "/profile/username"
  Route.map(Route.s('settings'), Route.Settings),                     // matches "/settings"
  Route.map(
    Route.s('blog', Route.s(Route.string, Route.string)),
    ({ year, slug }) => Route.BlogPost({ year, slug })
  )                                                                   // matches "/blog/2024/my-post"
])

// Usage in update function
UrlChanged: pure((model, { url }) => ({
  ...model,
  route: parseRoute(url) ?? Route.NotFound()  // parseRoute returns Option<Route>
})),
```

### Core parsing combinators

- `Route.top` - matches the root path "/"
- `Route.s(segment, nextParser)` - matches exact string segment, then continues with next parser
- `Route.string` - captures a string parameter
- `Route.int` - captures an integer parameter
- `Route.oneOf([...])` - tries multiple parsers in order
- `Route.map(parser, constructor)` - transforms successful parse result with constructor

### Example with more complex routes

```typescript
const parseRoute = Route.oneOf([
  // Simple routes
  Route.map(Route.top, Route.Home),
  Route.map(Route.s('about'), Route.About),

  // Routes with parameters
  Route.map(Route.s('user', Route.string), Route.Profile),
  Route.map(Route.s('post', Route.int), Route.Post),

  // Nested routes
  Route.map(Route.s('admin', Route.s('users', Route.s(Route.string, Route.s('edit')))), (userId) =>
    Route.AdminEditUser({ userId }),
  ),

  // Query parameters (future enhancement)
  Route.map(Route.s('search', Route.query(['q', 'page'])), ({ q, page }) =>
    Route.Search({ query: q, page: parseInt(page) || 1 }),
  ),
])
```

This approach provides:

- **Type safety** - Route constructors ensure correct parameter types
- **Composability** - Complex routes built from simple combinators
- **Familiarity** - Follows proven Elm patterns
- **Extensibility** - Easy to add new parsing combinators

## Benefits

- **Declarative routing** - Routes are just data in your model
- **Type-safe navigation** - Route parameters are typed
- **Browser integration** - Back/forward buttons work automatically
- **SPA performance** - No page reloads for internal navigation
- **Elm-like simplicity** - Framework handles browser complexity

## Next Steps

1. Implement core routing functionality in foldkit
2. Add routing helpers and utilities
3. Create a multi-page example application
4. Test browser integration (back/forward, bookmarks, etc.)
5. Add advanced features (query parameters, hash routing, etc.)

## Future Enhancements

- Lazy-loaded routes with code splitting
- Route guards/middleware
- Nested routing
- Query parameter helpers
- Hash-based routing option
