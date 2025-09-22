# @foldkit/vite-plugin

Vite plugin for Foldkit that enables hot module reloading with model preservation.

## Installation

```bash
npm install -D @foldkit/vite-plugin
# or
pnpm add -D @foldkit/vite-plugin
# or
yarn add -D @foldkit/vite-plugin
```

## Usage

Add the plugin to your `vite.config.ts`:

```typescript
import { foldkit } from '@foldkit/vite-plugin'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [foldkit()],
})
```

## What it does

When you save a file during development, the plugin:

1. Preserves your application's current state (model)
2. Triggers a full page reload
3. Restores the preserved model after reload

This means you can make code changes without losing your application's state - forms stay filled, counters keep their values, game positions are maintained, etc.

## How it works

The plugin uses Vite's WebSocket connection to communicate between the dev server and browser:

- **On file change**: The browser sends the current model to the Vite server for preservation
- **On reload**: The browser requests the preserved model from the server and initializes the Foldkit runtime with it

Model is preserved across hot reloads but cleared on manual browser refreshes, giving you control over when to reset your app.

## License

MIT
