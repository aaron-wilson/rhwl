import type { BadgeTone } from "../../ui/Badge";
import { rugRadar, type Grade, type Radar } from "../../domain/memes/rug-radar";
import type { LaunchView } from "./launch-store";

/** The Rug Radar for a launch, judged on its live curve status. */
export const radarFor = (launch: LaunchView): Radar =>
  rugRadar({
    ...launch.meme.risk,
    devShareBps: launch.meme.devShareBps,
    graduated: launch.graduated,
  });

export const gradeTone: Record<Grade, BadgeTone> = {
  A: "gain",
  B: "gain",
  C: "warn",
  D: "loss",
  F: "loss",
};
