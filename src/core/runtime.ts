import { Effect, Option, Queue, Ref, PubSub, Stream } from "effect";

export type Cmd<Msg> = Effect.Effect<Msg, never, never>;

export interface Runtime<Model, Msg> {
  dispatch: (msg: Msg) => void;
  messages$: Stream.Stream<Msg, never, never>;
}

export interface RuntimeInit<Model, Msg> {
  init: Model;
  update: (msg: Msg) => (m: Model) => [Model, Option.Option<Cmd<Msg>>];
  view: (m: Model, dispatch: (msg: Msg) => void) => void;
  mount: HTMLElement;
}

export const makeRuntime = <Model, Msg>({
  init,
  update,
  view,
  mount,
}: RuntimeInit<Model, Msg>): Effect.Effect<Runtime<Model, Msg>, never, never> =>
  Effect.gen(function* () {
    const queue = yield* Queue.unbounded<Msg>();
    const pubsub = yield* PubSub.unbounded<Msg>();

    const offer = (msg: Msg) =>
      Effect.all([Queue.offer(queue, msg), PubSub.publish(pubsub, msg)]).pipe(
        Effect.asVoid,
      );

    const dispatch = (msg: Msg) => Effect.runSync(offer(msg));
    const ref = yield* Ref.make(init);

    yield* Effect.sync(() => view(init, dispatch));

    yield* Effect.forever(
      Effect.gen(function* () {
        const msg = yield* Queue.take(queue);
        const model = yield* Ref.get(ref);
        const [next, cmdOpt] = update(msg)(model);
        yield* Ref.set(ref, next);
        yield* Effect.sync(() => view(next, dispatch));

        yield* Option.match(cmdOpt, {
          onNone: () => Effect.void,
          onSome: (cmd) => Effect.forkDaemon(cmd.pipe(Effect.flatMap(offer))),
        });
      }),
    ).pipe(Effect.forkDaemon);

    const messages$ = Stream.fromPubSub(pubsub);

    return { dispatch, messages$ };
  });
