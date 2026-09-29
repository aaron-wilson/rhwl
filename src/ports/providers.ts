import type { Chain } from "./chain";
import type { Clipboard } from "./clipboard";
import type { Clock } from "./clock";
import type { DemoControls } from "./demo-controls";
import type { Haptics } from "./haptics";
import type { Market } from "./market";
import type { Reporter } from "./reporter";
import type { Share } from "./share";
import type { Simulation } from "./simulation";
import type { KeyValueStorage } from "./storage";
import type { Visibility } from "./visibility";

/** Everything the app needs from the outside world, assembled once by the composition root. */
export interface Providers {
  readonly clock: Clock;
  readonly storage: KeyValueStorage;
  /** Lasts as long as the tab; used for the chunk reload mark. */
  readonly sessionStorage: KeyValueStorage;
  readonly reporter: Reporter;
  readonly haptics: Haptics;
  readonly share: Share;
  readonly clipboard: Clipboard;
  readonly visibility: Visibility;
  readonly market: Market;
  readonly chain: Chain;
  readonly simulation: Simulation;
  /** Present only when the world is simulated. */
  readonly demo: DemoControls | undefined;
}
