# Typing Game TODO

## Features

- [ ] Play again functionality (after game finishes)
- [ ] More game texts (variety of passages)
- [ ] Themed UI - retro glowing green with dark background

## Accessibility

- [ ] Accessible inputs (ARIA labels, keyboard navigation)

## Infrastructure

- [ ] Add health check route (`/health`)
- [ ] Configure Fly.io health checks to use the health check route
- [ ] Add Foldkit flags for configuration (Elm-style)
  - Server URL (instead of hardcoding in `rpc.ts`)
  - Environment-specific configs (dev vs prod)
