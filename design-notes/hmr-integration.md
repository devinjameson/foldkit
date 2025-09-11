# HMR Integration Design

## Overview

This document outlines the design for integrating Hot Module Replacement (HMR) into foldkit's runtime to enable state-preserving hot reloads during development.

## Goals

- **Zero-config HMR**: Automatically enabled when Schema is provided and `import.meta.hot` is available
- **State preservation**: Maintain model state across code changes using Schema encode/decode
- **Graceful fallbacks**: Fall back to fresh init if state restoration fails
- **Clean DOM transitions**: Ensure virtual DOM patching works correctly across reloads
- **Robust lifecycle management**: Properly start/stop Effect fibers without conflicts

## Key Learnings from Prototype

### What Works ✅
- `import.meta.hot.data` for cross-reload state persistence
- `dispose()` hook for saving state before module replacement
- Schema encode/decode provides robust serialization with fallback on failure
- Effect fiber interruption for stopping old apps
- State restoration maintains user progress across code changes

### Core Challenge ❌
- **Virtual DOM state contamination**: New app patches against old DOM, causing rendering issues
- **Timing coordination**: Need precise coordination between old app shutdown and new app startup
- **Container management**: Must ensure clean DOM slate for new app's virtual DOM system

## Technical Architecture

### 1. Runtime Detection and Wrapping

```typescript
// In makeElement/makeApplication
export const makeElement = <Model, Message, StreamDepsMap>(
  config: ElementConfig<Model, Message, StreamDepsMap>
): Effect.Effect<void, never, never> => {
  
  // Detect HMR availability
  if (import.meta.hot && config.Model) {
    return makeElementWithHMR(config)
  }
  
  // Standard runtime
  return makeRuntime({
    Model: config.Model,
    init: () => config.init(),
    update: config.update,
    view: config.view,
    // ...
  })
}
```

### 2. HMR-Enhanced Runtime

```typescript
const makeElementWithHMR = <Model, Message, StreamDepsMap>(
  config: ElementConfig<Model, Message, StreamDepsMap>
): Effect.Effect<void, never, never> => {
  
  // Generate unique storage key based on container
  const storageKey = `foldkit:${config.container.id || 'root'}`
  
  // Enhanced init with state restoration
  const hmrInit = (): [Model, Command<Message>[]] => {
    const saved = import.meta.hot?.data?.[storageKey]
    
    if (saved !== undefined) {
      // Try to decode saved state
      const decoded = Schema.decodeUnknownOption(config.Model)(saved)
      if (Option.isSome(decoded)) {
        console.log('🔄 HMR: Restored state')
        return [decoded.value, []]
      }
    }
    
    // Fallback to normal init
    console.log('🔄 HMR: Fresh start')
    return config.init()
  }
  
  // Setup HMR hooks
  import.meta.hot.dispose(() => {
    // Save current model state
    const currentModel = getCurrentModel() // Need to expose this
    const encoded = Schema.encodeSync(config.Model)(currentModel)
    import.meta.hot.data[storageKey] = encoded
    
    // Stop old app fiber
    if (import.meta.hot.data.appFiber) {
      Effect.runFork(Fiber.interrupt(import.meta.hot.data.appFiber))
    }
    
    // Critical: Clean container for new app
    if (config.container) {
      config.container.innerHTML = ''
    }
  })
  
  import.meta.hot.accept()
  
  // Create runtime with enhanced init
  const runtime = makeRuntime({
    Model: config.Model,
    init: hmrInit,
    update: config.update,
    view: config.view,
    container: config.container,
    // ...
  })
  
  // Store fiber reference for cleanup
  const fiber = Effect.runFork(runtime)
  if (import.meta.hot) {
    import.meta.hot.data.appFiber = fiber
  }
  
  return Effect.never // Keep running
}
```

### 3. Runtime State Exposure

The runtime needs to expose current model state for HMR saving:

```typescript
// In makeRuntime
const makeRuntime = (config) => Effect.gen(function* () {
  const modelRef = yield* Ref.make(initModel)
  
  // Expose for HMR (dev only)
  if (import.meta.hot) {
    (globalThis as any).__foldkit_getCurrentModel = () => Ref.getSync(modelRef)
  }
  
  // ... rest of runtime
})
```

## Container Management Strategy

### Problem
Snabbdom's `patch(container, newVNode)` expects a clean container, but after HMR the container has DOM from the old app that wasn't created by the new app's virtual DOM system.

### Solution
1. **In dispose hook**: Clear container after old app stops
2. **Timing guarantee**: Container is clean before new app's first render
3. **First render**: Uses `patch(container, vnode)` against empty container

### Implementation
```typescript
import.meta.hot.dispose(() => {
  // 1. Save state
  // 2. Stop old fiber
  // 3. Clean container - CRITICAL for virtual DOM
  config.container.innerHTML = ''
})
```

## Schema Integration

### Encode/Decode Strategy
- **Encode**: Use `Schema.encodeSync` with error handling
- **Decode**: Use `Schema.decodeUnknownOption` for safe restoration
- **Fallback**: If decode fails, fall back to normal `init()`

### Benefits
- **Type safety**: Schema ensures state structure matches
- **Evolution**: Schema changes automatically invalidate old state
- **Robustness**: Malformed data doesn't break the app

## Developer Experience

### Zero Configuration
```typescript
// This automatically enables HMR in dev mode
const app = Runtime.makeElement({
  Model,  // Presence of Schema enables HMR
  init,
  update,
  view,
  container: document.body,
})
```

### Opt-out
```typescript
// Disable HMR even with Schema
const app = Runtime.makeElement({
  Model,
  init,
  update,
  view,
  container: document.body,
  hmr: false, // Explicit disable
})
```

### Debug Info
- Console logs for state save/restore cycle
- Clear feedback when state restoration fails
- Performance impact only in development

## Error Handling

### State Restoration Failures
- **Invalid JSON**: Falls back to fresh init
- **Schema decode error**: Falls back to fresh init
- **Missing state**: Uses normal init path

### Fiber Management
- **Interrupt failures**: Use `Effect.runFork` to avoid blocking
- **Cleanup races**: Dispose hook ensures proper order

### Container Issues
- **Null container**: Skip container clearing
- **Multiple containers**: Use container.id for unique storage keys

## Performance Considerations

### Development Only
- All HMR code only runs when `import.meta.hot` is available
- Zero overhead in production builds
- Schema encode/decode only on save/restore, not every render

### Memory Management
- Fiber cleanup prevents memory leaks
- HMR data is bounded by Vite's lifecycle
- No persistent storage pollution

## Future Enhancements

### Advanced State Management
- Selective state preservation (exclude UI state, preserve business state)
- State transformation/migration on schema changes
- Multiple app instances with separate state

### Developer Tools
- Visual feedback for HMR events
- State diff visualization
- HMR performance metrics

## Implementation Plan

1. **Phase 1**: Basic HMR detection and state saving
2. **Phase 2**: Container management and virtual DOM fixes  
3. **Phase 3**: Error handling and edge cases
4. **Phase 4**: Developer experience polish
5. **Phase 5**: Documentation and examples

## Testing Strategy

- **Unit tests**: Schema encode/decode cycles
- **Integration tests**: Full HMR lifecycle
- **Manual testing**: Real development workflows
- **Edge case testing**: Schema evolution, network issues, etc.