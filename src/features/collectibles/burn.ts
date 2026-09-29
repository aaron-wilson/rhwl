import { collectionById, type Collectible, type Collection } from "../../data/collectibles";
import type { TxRequest } from "../../ports/chain";
import type { Providers } from "../../ports/providers";
import { accountsStore } from "../accounts";
import { NETWORK_FEE } from "../transactions/actions";
import { runTransaction } from "../transactions/actions";
import { collectiblesStore } from "./collectibles-store";

type Deps = Pick<Providers, "clock" | "chain" | "simulation">;

export function burnRequest(item: Collectible, collection: Collection): TxRequest {
  return {
    kind: "contract",
    summary: { verb: "Burned", detail: item.name },
    deltas: [],
    fee: NETWORK_FEE,
    to: collection.contract,
    collectibles: [{ id: item.id, name: item.name }],
  };
}

export function sendRequest(item: Collectible, to: string, label: string): TxRequest {
  return {
    kind: "send",
    summary: { verb: "Sent", detail: `${item.name} to ${label}` },
    deltas: [],
    fee: NETWORK_FEE,
    to,
    collectibles: [{ id: item.id, name: item.name }],
  };
}

/**
 * Moves a collectible out of its account through the normal transaction
 * lifecycle. It shows as leaving while in flight and comes back if the
 * transaction is rejected or fails. Once confirmed it leaves the grid, or
 * changes owner when the recipient is another of the user's accounts.
 * Resolves true when it moved.
 */
async function moveCollectible(
  deps: Deps,
  id: string,
  request: (item: Collectible) => TxRequest,
  newOwner: string | undefined,
): Promise<boolean> {
  const item = collectiblesStore.get().items.find((i) => i.id === id);
  if (item === undefined) return false;
  collectiblesStore.set((state) => ({ ...state, leaving: [...state.leaving, id] }));
  const tx = await runTransaction(deps, item.owner, request(item));
  const moved = tx.machine.state === "confirmed";
  collectiblesStore.set((state) => ({
    ...state,
    items: !moved
      ? state.items
      : newOwner === undefined
        ? state.items.filter((i) => i.id !== id)
        : state.items.map((i) => (i.id === id ? { ...i, owner: newOwner } : i)),
    leaving: state.leaving.filter((b) => b !== id),
  }));
  return moved;
}

/** Burns a collectible. Burning is permanent. */
export function burnCollectible(deps: Deps, id: string): Promise<boolean> {
  return moveCollectible(
    deps,
    id,
    (item) => burnRequest(item, collectionById(item.collectionId)),
    undefined,
  );
}

/** Sends a collectible to an address; `label` names the recipient in Activity. */
export function sendCollectible(
  deps: Deps,
  id: string,
  to: string,
  label: string,
): Promise<boolean> {
  const own = accountsStore.get().find((a) => a.address.toLowerCase() === to.toLowerCase());
  return moveCollectible(deps, id, (item) => sendRequest(item, to, label), own?.id);
}
