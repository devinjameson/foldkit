# create-foldkit: Project Scaffolding Tool

## Overview

A CLI tool for scaffolding new Foldkit projects, similar to create-react-app or create-next-app. Built with Effect CLI to maintain consistency with Foldkit's functional paradigm.

## User Experience

```bash
# Interactive mode
npx create-foldkit

# With arguments
npx create-foldkit my-app --template counter --style tailwind

# Using npm create
npm create foldkit@latest my-app
```

## Architecture

### Package Structure

```
packages/create-foldkit/
├── package.json
├── src/
│   ├── index.ts           # Entry point
│   ├── cli.ts             # Effect CLI setup
│   ├── commands/
│   │   └── create.ts      # Main create command
│   ├── templates/
│   │   ├── base/          # Shared files across templates
│   │   ├── counter/       # Counter example template
│   │   ├── todo/          # Todo app template
│   │   └── routing/       # Routing example template
│   └── utils/
│       ├── files.ts       # File operations
│       ├── git.ts         # Git initialization
│       └── packages.ts    # Package manager detection
└── tsconfig.json
```

### Dependencies

```json
{
  "dependencies": {
    "@effect/cli": "latest",
    "effect": "^3.16.8",
    "chalk": "^5.0.0",
    "fs-extra": "^11.0.0",
    "prompts": "^2.4.0"
  }
}
```

## Implementation Plan

### Phase 1: Basic Scaffolding

1. **Set up package structure**

   - Create `packages/create-foldkit/`
   - Configure package.json with bin entry
   - Set up TypeScript configuration

2. **Implement Effect CLI structure**

   - Create main command with Effect CLI
   - Add argument parsing for project name
   - Add options for template and style

3. **Create template system**

   - Extract counter example as first template
   - Create base template with shared files
   - Implement file copying logic with Effect

4. **Add package manager detection**
   - Detect npm/pnpm/yarn
   - Generate appropriate install commands
   - Handle dependency installation

### Phase 2: Enhanced Templates

5. **Add more templates**

   - Todo app template
   - Routing template
   - Full app template (shopping cart)

6. **Style options**

   - Tailwind CSS setup
   - Plain CSS option
   - No styles option

7. **TypeScript configuration options**
   - Strict mode settings
   - Path aliases setup
   - Effect-specific tsconfig

### Phase 3: Developer Experience

8. **Interactive prompts**

   - Project name validation
   - Template selection
   - Style preference
   - Package manager choice

9. **Git integration**

   - Initialize git repository
   - Create initial commit
   - Add .gitignore

10. **Post-installation**
    - Display next steps
    - Show available scripts
    - Link to documentation

## Templates

### Base Template (shared across all)

```
my-app/
├── .gitignore
├── package.json
├── tsconfig.json
├── vite.config.ts
├── index.html
└── src/
    └── styles.css    # If style option selected
```

### Counter Template

```
my-app/
├── [base files]
└── src/
    ├── main.ts       # Counter implementation
    └── styles.css
```

### Todo Template

```
my-app/
├── [base files]
└── src/
    ├── main.ts       # Todo app with localStorage
    └── styles.css
```

### Routing Template

```
my-app/
├── [base files]
└── src/
    ├── main.ts       # App with routing
    ├── pages/
    │   ├── home.ts
    │   └── about.ts
    └── styles.css
```

## CLI Commands

### Main Command

```typescript
const create = Command.make(
  'create',
  {
    projectName: Args.text({ name: 'project-name' }),
    template: Options.text('template').pipe(Options.withDefault('counter')),
    style: Options.text('style').pipe(Options.withDefault('tailwind')),
    packageManager: Options.text('pm').pipe(Options.optional),
  },
  ({ projectName, template, style, packageManager }) =>
    Effect.gen(function* () {
      // Scaffolding logic here
    }),
)
```

## Configuration Files

### Generated package.json

```json
{
  "name": "my-app",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "foldkit": "^0.1.0-canary.4",
    "effect": "^3.16.8"
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "typescript": "^5.4.0",
    "@tailwindcss/vite": "^4.1.10",
    "tailwindcss": "^4.1.10"
  }
}
```

### Generated vite.config.ts

```typescript
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [tailwindcss()],
})
```

### Generated tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022", "DOM"],
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "exactOptionalPropertyTypes": true,
    "isolatedModules": true,
    "noEmit": true
  },
  "include": ["src/**/*"]
}
```

## Publishing Strategy

1. **Package name**: `create-foldkit`
2. **Version**: Start at `0.1.0-canary.1` to match main package
3. **Bin entry**: Points to compiled CLI entry
4. **Dependencies**: Bundled to avoid installation delays

## Success Criteria

- [ ] Users can scaffold a new project in < 30 seconds
- [ ] Templates work out of the box with `npm run dev`
- [ ] Generated projects match example quality
- [ ] Clear documentation and next steps
- [ ] Supports all major package managers

## Future Enhancements

- **Template repository**: Allow custom GitHub templates
- **Plugin system**: Add optional features (testing, linting)
- **Update notifications**: Check for latest Foldkit version
- **Telemetry**: Anonymous usage statistics (opt-in)
- **Online playground**: StackBlitz/CodeSandbox integration
