import { Effect, Queue, Ref, Option, Match } from "effect";
import { taggedEnum, TaggedEnum } from "effect/Data";

type Msg = TaggedEnum<{
  Increment: {};
  Decrement: {};
}>;
const Msg = taggedEnum<Msg>();

type Model = {
  count: number;
};

const update =
  (msg: Msg) =>
  (model: Model): [Model, Option.Option<Effect.Effect<Msg, never, never>>] =>
    Match.value(msg).pipe(
      Match.withReturnType<
        [Model, Option.Option<Effect.Effect<Msg, never, never>>]
      >(),
      Match.tagsExhaustive({
        Increment: () => [{ count: model.count + 1 }, Option.none()],
        Decrement: () => [{ count: model.count - 1 }, Option.none()],
      }),
    );

const view = (model: Model, dispatch: (msg: Msg) => Effect.Effect<void>) => {
  const app = document.getElementById("app")!;

  app.innerHTML = `
    <div>
      <h1>Count: ${model.count}</h1>
      <button id="inc">+</button>
      <button id="dec">-</button>
    </div>
  `;

  // Wire up events
  document.getElementById("inc")!.onclick = () =>
    Effect.runSync(dispatch(Msg.Increment()));
  document.getElementById("dec")!.onclick = () =>
    Effect.runSync(dispatch(Msg.Decrement()));
};

// 5. The runtime (simplest possible)
const runApp = (initialModel: Model) =>
  Effect.gen(function* () {
    const messageQueue = yield* Queue.unbounded<Msg>();
    const modelRef = yield* Ref.make(initialModel);

    const dispatch = (msg: Msg) => Queue.offer(messageQueue, msg);

    // Initial render
    yield* Ref.get(modelRef).pipe(
      Effect.andThen((model) => Effect.sync(() => view(model, dispatch))),
    );

    // Update loop
    yield* Effect.forever(
      Effect.gen(function* () {
        const msg = yield* Queue.take(messageQueue);
        const currentModel = yield* Ref.get(modelRef);

        const [newModel, _commandOption] = update(msg)(currentModel);
        yield* Ref.set(modelRef, newModel);

        // Re-render
        yield* Effect.sync(() => view(newModel, dispatch));
      }),
    ).pipe(Effect.forkDaemon);
  });

// Start the app!
const main = Effect.gen(function* () {
  yield* runApp({ count: 0 });
});

Effect.runFork(main);
