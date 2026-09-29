import { assets } from "../../data/assets";
import type { Asset } from "../../data/types";

const slugOf = (asset: Asset) => asset.id.replace(":", "-");
const bySlug = new Map(assets.map((asset) => [slugOf(asset), asset]));

/** The asset page's address: "/asset/rh-NVDA". */
export function assetPath(asset: Asset): string {
  return `/asset/${slugOf(asset)}`;
}

/** The holders' room for a Stock Token: "/rooms/rh-NVDA". */
export function roomPath(asset: Asset): string {
  return `/rooms/${slugOf(asset)}`;
}

export function assetBySlug(slug: string): Asset | undefined {
  return bySlug.get(slug);
}
