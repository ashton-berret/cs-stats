import { plugin } from "bun";
import path from "node:path";

plugin({
  name: "sveltekit-aliases",
  setup(build) {
    build.onResolve({ filter: /^\$lib(?:\/.*)?$/ }, (args) => {
      const rest = args.path === "$lib" ? "" : args.path.slice("$lib/".length);
      return { path: path.join(import.meta.dir, "..", "lib", rest) };
    });
  },
});
