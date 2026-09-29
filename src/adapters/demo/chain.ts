import { assetById } from "../../data/assets";
import { add, amount } from "../../domain/money/amount";
import { netEffects } from "../../domain/tx/effects";
import { createRandom } from "../../lib/prng";
import type { Chain, ChainTx, Holding, TxRequest } from "../../ports/chain";
import type { Clock } from "../../ports/clock";

export interface DemoChainOptions {
  readonly clock: Clock;
  readonly seed: string;
  readonly genesis: Readonly<Record<string, readonly Holding[]>>;
  /** Fake network latency: time to accept a broadcast, then time to confirm. */
  readonly latency?: { readonly acceptMs: number; readonly confirmMs: number };
  /** Already-confirmed transactions shown in history. They do not change genesis balances. */
  readonly history?: readonly {
    readonly account: string;
    readonly at: string;
    readonly request: TxRequest;
  }[];
}

/** A chain the demo can steer: the next transaction can be made to fail on purpose. */
export interface DemoChain extends Chain {
  failNext(reason: string): void;
}

const zero = (assetId: string) => amount(0n, assetById(assetId).decimals);

export function createDemoChain({
  clock,
  seed,
  genesis,
  latency,
  history = [],
}: DemoChainOptions): DemoChain {
  const { acceptMs, confirmMs } = latency ?? { acceptMs: 350, confirmMs: 1400 };
  const ledgers = new Map(
    Object.entries(genesis).map(([account, holdings]) => [
      account,
      new Map(holdings.map((h) => [h.assetId, h.quantity])),
    ]),
  );
  const txs = new Map<
    string,
    { tx: ChainTx; account: string; waiters: ((tx: ChainTx) => void)[] }
  >();
  const nonces = new Map<string, number>();
  const listeners = new Set<() => void>();
  let pendingFailure: string | undefined;

  history.forEach(({ account, at, request }) => {
    const nonce = nonces.get(account) ?? 0;
    nonces.set(account, nonce + 1);
    const hash = hashFor(account, nonce);
    const when = new Date(at);
    txs.set(hash, {
      account,
      waiters: [],
      tx: {
        hash,
        nonce,
        request,
        status: "confirmed",
        submittedAt: when,
        settledAt: when,
        error: undefined,
      },
    });
  });

  const emit = () => {
    listeners.forEach((listener) => {
      listener();
    });
  };
  const ledger = (account: string) => {
    let found = ledgers.get(account);
    if (found === undefined) {
      found = new Map();
      ledgers.set(account, found);
    }
    return found;
  };

  function hashFor(account: string, nonce: number): string {
    const next = createRandom(`${seed}:${account}:${nonce}`);
    const hex = Array.from({ length: 8 }, () =>
      Math.floor(next() * 2 ** 32)
        .toString(16)
        .padStart(8, "0"),
    );
    return `0x${hex.join("")}`;
  }

  function finish(hash: string, failure: string | undefined) {
    const entry = txs.get(hash);
    if (entry === undefined) return;
    const book = ledger(entry.account);
    const effects = netEffects(entry.tx.request);
    const short = effects.find(
      ({ assetId, quantity }) => add(book.get(assetId) ?? zero(assetId), quantity).base < 0n,
    );
    const error =
      failure ??
      (short === undefined ? undefined : `Insufficient ${assetById(short.assetId).symbol}`);
    if (error === undefined) {
      effects.forEach(({ assetId, quantity }) =>
        book.set(assetId, add(book.get(assetId) ?? zero(assetId), quantity)),
      );
    }
    entry.tx = {
      ...entry.tx,
      status: error === undefined ? "confirmed" : "failed",
      settledAt: clock.now(),
      error,
    };
    entry.waiters.splice(0).forEach((resolve) => {
      resolve(entry.tx);
    });
    emit();
  }

  return {
    balances: (account) =>
      [...ledger(account)]
        .filter(([, q]) => q.base !== 0n)
        .map(([assetId, quantity]) => ({ assetId, quantity })),
    nonce: (account) => nonces.get(account) ?? 0,
    history: (account) =>
      [...txs.values()]
        .filter((entry) => entry.account === account)
        .map((entry) => entry.tx)
        .sort((a, b) => b.nonce - a.nonce),
    submit(account, request) {
      const nonce = nonces.get(account) ?? 0;
      nonces.set(account, nonce + 1);
      const hash = hashFor(account, nonce);
      const failure = pendingFailure;
      pendingFailure = undefined;
      const tx: ChainTx = {
        hash,
        nonce,
        request,
        status: "pending",
        submittedAt: clock.now(),
        settledAt: undefined,
        error: undefined,
      };
      return new Promise((resolve) => {
        clock.schedule(() => {
          txs.set(hash, { tx, account, waiters: [] });
          emit();
          resolve(hash);
          clock.schedule(() => {
            finish(hash, failure);
          }, confirmMs);
        }, acceptMs);
      });
    },
    settle(hash) {
      const entry = txs.get(hash);
      if (entry === undefined) return Promise.reject(new Error(`Unknown transaction ${hash}`));
      if (entry.tx.status !== "pending") return Promise.resolve(entry.tx);
      return new Promise((resolve) => entry.waiters.push(resolve));
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    failNext(reason) {
      pendingFailure = reason;
    },
  };
}
