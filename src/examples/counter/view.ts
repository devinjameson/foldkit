import { Model } from "./model";
import type { Msg } from "./update";

export const view = (model: Model, dispatch: (msg: Msg) => void): void => {
  const app = document.getElementById("app")!;

  app.innerHTML = `
    <div>
      <button id="decrement">-</button>
      <span>${model.count}</span>
      <button id="increment">+</button>
    </div>
  `;

  document.getElementById("increment")!.onclick = () =>
    dispatch({ tag: "Increment" });
  document.getElementById("decrement")!.onclick = () =>
    dispatch({ tag: "Decrement" });
};
