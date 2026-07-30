import {
  Subscription,
  click,
  expectNoOutMessage,
  expectOutMessage,
  given,
  role,
  scene,
} from 'foldkit/scene'

// A Submodel's update returns [Model, Commands, Option<OutMessage>]. Scene
// tracks the third element, so a page-level test asserts what the child
// announced to its parent.
scene(
  { update, view },
  given(initialModel),
  click(role('button', { name: 'Log out' })),
  expectOutMessage(RequestedLogout()),
  Subscription.emit(CompletedAction()),
  expectNoOutMessage(),
)
