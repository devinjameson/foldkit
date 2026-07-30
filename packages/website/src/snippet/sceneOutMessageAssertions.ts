import { Scene } from 'foldkit'

// A Submodel's update returns [Model, Commands, Option<OutMessage>]. Scene
// tracks the third element, so a page-level test asserts what the child
// announced to its parent.
Scene.scene(
  { update, view },
  Scene.with(initialModel),
  Scene.click(Scene.role('button', { name: 'Log out' })),
  Scene.expectOutMessage(RequestedLogout()),
  Scene.Subscription.emit(CompletedAction()),
  Scene.expectNoOutMessage(),
)
