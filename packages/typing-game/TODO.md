# Typing Game TODO

## Features

- [x] Play again functionality (after game finishes)
- [x] Do not repeat game texts in the same room until all have been used
- [x] More game texts (variety of passages)
- [ ] Themed UI - retro glowing green with dark background
- [ ] If someone loads a room page e.g. /room/noble-iron-fair and they are not
      in that room, they should see a username input field and a "Join Room" button
- [ ] Add "host" concept:
  - Only host can start the game when enough players have joined
  - Only host can play again after the game is finished
  - If host leaves, assign a new host
- [ ] Remove user from room when they disconnect (Stream.ensure I think?)

## Bugs

- [x] Autofocus doesn't work on Safari when the text input appears (works on refresh)
- [x] Room ID input with live room ID validation is slow
- [ ] Underline showing when you are disappears at end of lines

## Accessibility

- [ ] Accessible inputs (ARIA labels, keyboard navigation)

## Infrastructure

- [x] Add Foldkit flags for configuration (Elm-style)
  - Server URL (instead of hardcoding in `rpc.ts`)
  - Environment-specific configs (dev vs prod)
- [ ] Add health check route (`/health`) (tried doing this but ran into strange
      issue with getting everything to typecheck, probably need to spend an afternoon
      on this and maybe get some help from the Effect Discord)
- [ ] Configure Fly.io health checks to use the health check route
