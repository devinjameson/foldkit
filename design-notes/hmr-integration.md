# HMR Integration Design

## Overview

This document outlines the design for integrating Hot Module Replacement (HMR) into foldkit's runtime to enable state-preserving hot reloads during development.

## Goals

- **Zero-config HMR**: Automatically enabled when Schema is provided and `import.meta.hot` is available
- **State preservation**: Maintain model state across code changes using Schema encode/decode
- **Graceful fallbacks**: Fall back to fresh init if state restoration fails
- **Clean DOM transitions**: Ensure virtual DOM patching works correctly across reloads
- **Robust lifecycle management**: Properly start/stop Effect fibers without conflicts

## Key Learnings from Implementation Attempt

### What We Discovered ✅

1. **Vite HMR Module Boundaries**: 
   - `import.meta.hot.dispose()` hooks only run for **entry point modules** being replaced
   - Library code (like foldkit runtime) doesn't get dispose hooks called
   - This is why our runtime's dispose hook never executed

2. **Manual HMR Approach Issues**:
   - Required boilerplate in every user app
   - Fighting against Vite's HMR system design
   - Error: `Effect.runSync(Fiber.interrupt(fiber))` - async operations can't be run synchronously

3. **State Restoration Works**:
   - `import.meta.hot.data` persistence across reloads ✅
   - Schema encode/decode for type-safe serialization ✅
   - Container clearing for clean virtual DOM patches ✅

4. **React's Approach**:
   - Uses **Vite plugins** (React Fast Refresh)
   - Zero HMR code in user applications
   - Automatic state preservation
   - Build-time code injection

### Architectural Insight 🎯

**The proper approach is a Vite plugin**, not manual HMR hooks in user code.

## Recommended Implementation Plan

### Phase 1: Clean Up Foldkit Core

**Add to foldkit runtime** (minimal HMR support):

```typescript
// In makeRuntime - keep only state restoration
const storageKey = `foldkit:${container.id || 'root'}`
const restoredModel = import.meta.hot?.data?.[storageKey]
  ? pipe(
      Schema.decodeUnknownOption(Model)(import.meta.hot.data[storageKey]),
      Option.match({
        onSome: (value) => {
          console.log('🔄 HMR: Restored state')
          return value
        },
        onNone: () => undefined,
      }),
    )
  : undefined

const [initModel, initCommands] = restoredModel
  ? [restoredModel, []]
  : init(Option.getOrUndefined(currentUrl))
```

**Fix startApp stop method**:
```typescript
return {
  stop: () => Effect.runFork(Fiber.interrupt(fiber)), // Not runSync!
}
```

### Phase 2: Create @foldkit/vite-plugin

**Plugin Architecture**:

1. **Detection**: Find `Runtime.startApp()` calls in source code
2. **Code Injection**: Wrap calls with HMR logic at build time
3. **State Management**: Handle save/restore lifecycle

**Plugin Implementation Strategy**:

```typescript
// Plugin detects this:
Runtime.startApp({ Model, init, update, view, container })

// And transforms it to:
const app = Runtime.startApp({ Model, init, update, view, container })

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    // Save current model state
    const getModel = (globalThis as any).__foldkit_getModel_${containerId}
    if (getModel) {
      try {
        const model = getModel()
        const encoded = Schema.encodeSync(Model)(model)
        import.meta.hot.data['foldkit:${containerId}'] = encoded
        console.log('💾 HMR: Saved state')
      } catch (error) {
        console.warn('⚠️ HMR: Failed to save state:', error)
      }
    }
    
    // Clean container and stop app
    container.innerHTML = ''
    app.stop()
  })
  
  import.meta.hot.accept()
}
```

**Plugin Features**:
- **AST parsing** to find startApp calls
- **Unique container IDs** for multiple apps
- **Global model access** via runtime exposure
- **Automatic cleanup** and restart

### Phase 3: Developer Experience

**User Code** (zero HMR boilerplate):
```typescript
// vite.config.js
import { foldkit } from '@foldkit/vite-plugin'

export default {
  plugins: [foldkit()]
}

// main.ts - just this!
Runtime.startApp({
  Model,
  init,
  update,
  view,
  container: document.body,
})
```

**Plugin Configuration**:
```typescript
// Advanced usage
foldkit({
  exclude: ['**/node_modules/**'],
  debug: true, // Show HMR logs
  preserveState: true, // Default true
})
```

## Technical Details for Plugin

### State Access Pattern

**Runtime exposes model getter**:
```typescript
// In makeRuntime
if (import.meta.hot) {
  const containerKey = container.id || 'root'
  ;(globalThis as any)[`__foldkit_getModel_${containerKey}`] = 
    () => Effect.runSync(Ref.get(modelRef))
}
```

**Plugin uses getter for state saving**:
```typescript
const getModel = (globalThis as any)[`__foldkit_getModel_${containerKey}`]
if (getModel) {
  const model = getModel()
  const encoded = Schema.encodeSync(Model)(model)
  import.meta.hot.data[storageKey] = encoded
}
```

### Code We Need in Foldkit

**Minimal HMR support** (state restoration only):
1. Check `import.meta.hot?.data` for saved state on init
2. Use Schema.decodeUnknownOption for safe deserialization
3. Fall back to normal init() if no saved state or decode fails
4. Expose current model via global getter for plugin access
5. Fix `stop()` to use `Effect.runFork` not `Effect.runSync`

**That's it!** No dispose hooks, no manual HMR lifecycle management.

### Error Handling

- **Schema decode failures**: Fall back to fresh init
- **Model access errors**: Warn and continue
- **Multiple containers**: Use container.id for unique keys
- **Plugin parse errors**: Skip transformation, warn user

## Benefits of Plugin Approach

1. **Zero boilerplate** for users
2. **Automatic state preservation** 
3. **Framework-agnostic** HMR
4. **Build-time optimization**
5. **Proper separation of concerns**

## Testing Strategy

- **Unit tests**: Schema encode/decode cycles
- **Plugin tests**: AST transformation correctness
- **Integration tests**: Full HMR lifecycle with plugin
- **Manual testing**: Real development workflows
- **Edge case testing**: Multiple apps, complex schemas
