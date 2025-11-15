# Typing Game TODO

## Features

- [x] Play again functionality (after game finishes)
- [x] Do not repeat game texts in the same room until all have been used
- [x] More game texts (variety of passages)
- [x] Themed UI - retro glowing green with dark background
- [x] If someone loads a room page e.g. /room/noble-iron-fair and they are not
      in that room, they should see a username input field and a "Join Room" button
- [x] If someone loads a room page and the room does not exist, show "Room not
      found" error
- [x] Add "host" concept:
  - Only host can start the game
  - Only host can restart the game after the game is finished
  - If host leaves, assign a new host
- [x] Remove user from room when they disconnect (Stream.ensure I think?)
- [ ] Copy room ID button (use same pattern as Foldkit website)
- [ ] Add leave room button (if you want to join a different room)
- [x] Move room id input to the right of the label (same as the username input)
- [ ] When all players leave a room, delete the room
- [ ] Add "Made with Foldkit and Effect" footer
- [ ] If a user joins a room and they have the same username as an existing
      user in the room, append a (2), (3), etc to their username to make it
      unique
- [ ] 24 chars max username

## Bugs

- [x] Autofocus doesn't work on Safari when the text input appears (works on refresh)
- [x] Room ID input with live room ID validation is slow
- [ ] Background showing where you are disappears at end of lines

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
