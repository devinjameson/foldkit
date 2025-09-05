# Nested Models and Updates

**Status**: Future consideration  
**Context**: After basic routing is implemented

## Problem

When building larger applications with multiple pages/components, we need a way to:

- Keep page-specific state isolated
- Handle page-specific updates without polluting the main update function
- Compose child update functions into the parent update function

## Elm's Solution

Elm uses a "nested update" pattern where child components have their own `update` function, and parent components map child messages and commands:

```elm
-- Main update
update : Msg -> Model -> (Model, Cmd Msg)
update msg model =
    case msg of
        HomeMsg homeMsg ->
            let
                (newHomeModel, homeCmd) = Home.update homeMsg model.homeModel
            in
            ( { model | homeModel = newHomeModel }
            , Cmd.map HomeMsg homeCmd  -- Map child commands to parent messages
            )
```

## Proposed foldkit Solution

```typescript
const nested =
  <ParentModel, ChildModel, ChildMessage>(
    extract: (parent: ParentModel) => ChildModel,
    merge: (parent: ParentModel, child: ChildModel) => ParentModel,
    childUpdate: Update<ChildModel, ChildMessage>,
  ) =>
  (parentModel: ParentModel, childMsg: ChildMessage) => {
    const [newChild, childCmd] = childUpdate(extract(parentModel), childMsg)

    return [merge(parentModel, newChild), childCmd.pipe(Effect.map((msg) => ParentMsg(msg)))]
  }

// Usage - simple and readable!
const update = fold<Model, Message>({
  HomeMessage: nested(
    (model) => model.homeModel, // extract
    (model, home) => ({ ...model, homeModel: home }), // merge
    homeUpdate,
  ),
})
```

## Benefits

- **Isolation**: Each page/component manages its own state and logic
- **Composition**: Child updates compose cleanly into parent updates
- **Scalability**: Large apps can be broken into manageable pieces
- **Reusability**: Child components can be reused across different parents

## Implementation Notes

- Need to handle command mapping (child commands → parent messages)
- Consider lens libraries for cleaner model access/updates
- Might want helper functions to reduce boilerplate
- Should work with both `pure` and `pureCommand` update patterns

## Command Batching Challenge

**Discovered during shopping cart implementation**: When a parent update handler needs to run its own command alongside a child command, there's no clean way to batch them.

Current workaround:

```typescript
// Only return child command OR parent command, not both
return [newModel, Option.map(childCommand, Command.map(...))]
```

**Elm's solution**: `Cmd.batch [cmd1, cmd2, cmd3]` - tells runtime to execute all commands, each potentially producing messages that get fed back to update.

**Problem**: This requires runtime support to enqueue multiple messages, not just a simple helper function.

**Potential solutions**:

1. Modify runtime to support batching multiple commands
2. Add `Command.batch` helper that uses `Effect.all` + `Effect.forEach` to enqueue each result
3. Accept current limitation and choose one command per update

## Next Steps

1. ✅ Implement basic routing
2. ✅ Build a multi-page example (shopping cart) with nested updates
3. ✅ Identify pain points and boilerplate
4. 🚧 Design and implement the nested update API (partially done - using direct functions)
5. Consider command batching runtime changes
6. Refactor examples to use finalized nested update patterns
