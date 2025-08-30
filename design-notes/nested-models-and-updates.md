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

### Option 1: Update.map helper

```typescript
const update = fold<Model, Message>({
  HomeMessage: ({ msg }) => 
    Update.map(
      (model: Model) => model.homeModel,           // Lens to child model
      (model: Model, newHome: HomeModel) => ({ ...model, homeModel: newHome }), 
      (childMsg: HomeMessage) => Message.HomeMessage({ msg: childMsg }),
      homeUpdate                                   // Child update function
    ),
})
```

### Option 2: nested helper

```typescript
const nested = <ParentModel, ChildModel, ChildMessage>(
  lens: (parent: ParentModel) => ChildModel,
  setter: (parent: ParentModel, child: ChildModel) => ParentModel,
  childUpdate: Update<ChildModel, ChildMessage>
) => // ... implementation

// Usage
const update = fold<Model, Message>({
  HomeMessage: nested(
    model => model.homeModel,
    (model, home) => ({ ...model, homeModel: home }),
    homeUpdate
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

## Next Steps

1. Implement basic routing first
2. Build a multi-page example without nested updates
3. Identify pain points and boilerplate
4. Design and implement the nested update API
5. Refactor multi-page example to use nested updates