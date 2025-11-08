# Typing Game TODO

## Features

- [ ] Play again functionality (after game finishes)
- [ ] More game texts (variety of passages)
- [ ] Themed UI - retro glowing green with dark background
- [ ] If someone loads a room page e.g. /room/noble-iron-fair and they are not
in that room, they should see a username input field and a "Join Room" button

## Accessibility

- [ ] Accessible inputs (ARIA labels, keyboard navigation)

## Infrastructure

- [ ] Add Foldkit flags for configuration (Elm-style)
  - Server URL (instead of hardcoding in `rpc.ts`)
  - Environment-specific configs (dev vs prod)
- [ ] Add health check route (`/health`) (tried doing this but ran into strange
issue with getting everything to typecheck, probably need to spend an afternoon
on this and maybe get some help from the Effect Discord)
- [ ] Configure Fly.io health checks to use the health check route 
