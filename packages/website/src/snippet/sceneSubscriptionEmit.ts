import { Scene } from 'foldkit'

// A Message whose real cause is a Subscription has no element in the
// rendered tree. Emit it directly; the step feeds it through update and
// re-renders like any other step.
Scene.Subscription.emit(Ticked())
Scene.Subscription.emit(ReceivedServerFrame({ frame }))

// Don't emit a Message that has a DOM affordance. Click the actual
// button instead; the interaction proves the handler wiring that emit skips.
Scene.click(Scene.role('button', { name: 'Log out' }))
