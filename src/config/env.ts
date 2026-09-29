import * as z from "zod/mini";

/**
 * The app's only reader of environment variables, parsed once. All are optional:
 * a fresh clone runs with no configuration at all.
 */
const Env = z.object({
  VITE_CLOCK: z._default(z.enum(["demo", "browser"]), "demo"),
  VITE_STORAGE: z._default(z.enum(["browser", "memory"]), "browser"),
  VITE_HAPTICS: z._default(z.enum(["browser", "demo"]), "browser"),
  VITE_SHARE: z._default(z.enum(["browser", "demo"]), "browser"),
  VITE_CLIPBOARD: z._default(z.enum(["browser", "demo"]), "browser"),
  VITE_REPORTER: z._default(z.enum(["browser", "demo"]), "browser"),
});

export type AppEnv = z.infer<typeof Env>;

export function parseEnv(source: Record<string, unknown>): AppEnv {
  return Object.freeze(Env.parse(source));
}
