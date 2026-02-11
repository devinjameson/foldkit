# TODO

## Documentation

- [x] Add "Model-as-Union" pattern documentation
  - Current "Scaling with Submodels" docs cover embedding child models as struct fields
  - Need to document the pattern where the Model itself is a union of exclusive states (e.g., `S.Union(LoggedOut.Model, LoggedIn.Model)`)
  - Covers: state transitions between variants, update returning result unions, guard checks
  - Reference: `examples/auth` demonstrates this pattern
  - Need to communicate the "rules of thumb" for this -- e.g. when to use OutgoingMessage, where to put that message organizationally, etc.

- [x] Document 3-tuple OutMessage pattern for child-to-parent communication
  - `[Model, Commands, Option<OutMessage>]` return type from update functions
  - When to use OutMessage vs Commands for signaling parent
  - How parent updates handle child OutMessages via Option.match
  - The mappedCommands pattern for lifting child commands to parent level
  - OutMessage should be a Schema union in message.ts (not just type alias)
  - Reference: `examples/auth` demonstrates the full flow

- [x] Document multiple instances with independent state
  - React devs expect `<Foo /> <Foo /> <Foo />` to give three isolated state slices
  - Show how to explicitly model this: `sideMenu1: SideMenu.Model, sideMenu2: SideMenu.Model, ...`
  - Explain the tradeoff: more explicit, but all state visible in model
  - Added as FAQ in "Coming from React" page with code snippet showing both patterns

- [ ] Document arrays of submodels with ID-based message routing
  - Common React pattern: `items.map(item => <ItemWithState key={item.id} />)`
  - Show Foldkit equivalent: `S.Array(Item.Model)` with messages containing item ID
  - Demonstrate routing messages to correct array element in update
  - Maybe we need an example app for this too?

- [x] Expand "Coming from React" tradeoffs section
  - Current "Component encapsulation" bullet mentions the tradeoff but doesn't show the alternative
  - Add concrete example of how you handle multiple instances in Foldkit vs React
  - Maybe the table with the React/Foldkit columns should be moved up to frame the comparison earlier?
  - Done: Added FAQ entry with submodel pattern explanation and code example

- [x] Update website examples page to include auth example

- [x] Add docs on errorView to website
  - Also add an example app showcasing usage

- [x] Add auth example to README

- [x] Clicking Foldkit logo in nav should probably link home?

- [x] Mobile menu improvements (scrollable nav, icons at bottom, fixed header)

- [ ] Changelog

- [ ] Search for the doc site (Cmd+K or similar)

- [ ] Document FieldValidation module on the website

- [x] Library reference docs that pull directly from code comments

## Tooling

- [x] Add auth example as starter template in `create-foldkit-app`

- [x] Upgrade node (Vite is complaining)

## Foldkit

- [ ] Why does the html function not require a generic arg?

- [ ] Route.oneOf has overloads up to 10 args — consider making it truly variadic or documenting that users should chain oneOfs for more

- [x] Noticed that Effect is not technically a dependency of Foldkit, seems wrong?
  - Moved `@effect/platform-browser` from dependency to peerDependency (alongside `effect`)
  - Both also listed in devDependencies for local dev/test

- [ ] Foldkit UI — a port of Headless UI to Foldkit
  - Accessible, unstyled UI components as Model/Message/Update modules
  - Components: Dialog, Combobox, Listbox, Menu, Popover, Disclosure, Tabs, etc.
  - Each component exposes its own Model, Message, update, and view
  - Consumers compose them into their app's model and wire messages through update

- [ ] Are we using Effect.Clock everywhere we should be in the examples, instead of Date.now()?
