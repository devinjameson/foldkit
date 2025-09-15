# Foldkit Time Travel Debugger Implementation Plan

## Current Runtime Architecture Analysis

### Core Runtime Loop (runtime.ts:167-186)

The main runtime operates with this flow:

1. **Message Queue**: Unbounded queue for messages (`messageQueue`)
2. **Model State**: Managed via `modelRef` (Ref<Model>)
3. **Update Cycle**: Forever loop that:
   - Takes message from queue
   - Calls `update(currentModel, message)` → returns `[nextModel, commands]`
   - Executes commands asynchronously
   - Re-renders only if model changed (using schema equivalence check)
   - Publishes model to subscribers

### Key Injection Points Identified

1. **Message Dispatch**: Line 169 - `Queue.take(messageQueue)`
2. **Model Updates**: Line 173 - `update(currentModel, message)`
3. **State Changes**: Line 179-182 - Model equivalence check and updates
4. **View Rendering**: Line 181 - `render(nextModel)`

### Current Infrastructure

- No existing dev mode detection
- No debugging infrastructure
- Uses Snabbdom for virtual DOM
- Effect-based architecture with PubSub for model changes
- Command streams for side effects

## Time Travel Debugger Design

### 1. Debugger State Management

```typescript
interface DebuggerState<Model, Message> {
  history: Array<{ model: Model; message: Message; timestamp: number }>
  currentIndex: number
  isEnabled: boolean
  maxHistorySize: number
}
```

### 2. Core Components to Build

#### A. Enhanced Runtime with Debug Mode

- Wrap `makeRuntime` function to detect dev environment
- Inject debugger hooks into the main runtime loop
- Capture every model/message pair with timestamps

#### B. History Management

- Ring buffer for efficient memory usage
- State serialization/deserialization
- Jump to any point in history
- Model diffing capabilities

#### C. Debug UI Components

- Timeline scrubber for state navigation
- Model inspector showing current state
- Message log with filtering
- Export/import functionality for state snapshots

#### D. Developer Experience

- Browser extension integration points
- Console commands for programmatic control
- Hot reloading compatibility

### 3. Implementation Strategy

#### Phase 1: Core Debugger Runtime

1. Create `makeDebugRuntime` wrapper function
2. Implement history capture in the main runtime loop
3. Add time travel navigation (previous/next/jump)
4. Basic console API for testing

#### Phase 2: Debug UI System

1. Build overlay UI components using Foldkit's HTML DSL
2. Create timeline and inspector views
3. Add state export/import functionality
4. Integrate with browser devtools

#### Phase 3: Developer Experience

1. Environment detection (dev vs prod)
2. Performance optimizations for large state histories
3. Integration with build tools and hot reloading
4. Documentation and examples

### 4. Technical Approach

The debugger will:

- Hook into the runtime loop at lines 169-182 in `runtime.ts`
- Maintain parallel state history without affecting app performance
- Use Foldkit's own reactive system for the debug UI
- Leverage Effect's referential transparency for safe state replay
- Integrate with the existing `Dispatch` context for seamless debugging

This approach ensures the debugger is built using Foldkit's own patterns and integrates naturally with the framework's Effect-based architecture.
