import { Data, Match, Option } from "effect";
import type { Model } from "./model";
import type { Cmd } from "../../core/runtime";

export type Msg = Data.TaggedEnum<{
  Increment: {};
  Decrement: {};
}>;

export const Msg = Data.taggedEnum<Msg>();

export const update =
  (msg: Msg) =>
  (model: Model): [Model, Option.Option<Cmd<Msg>>] => {
    return Match.value(msg).pipe(
      Match.tagsExhaustive({
        Increment: () => [{ count: model.count + 1 }, Option.none()],
        Decrement: () => [{ count: model.count + -1 }, Option.none()],
      }),
    );
  };
