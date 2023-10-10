import { module } from "window-or-global";

export const delay = (duration: number) =>
  new Promise((resolve) => setTimeout(resolve, duration));
