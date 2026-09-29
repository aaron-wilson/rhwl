import { destinations } from "../../app/destinations";
import { hapticsOnStore, hideSmallStore } from "../../app/preferences";
import { togglePresenter } from "../../app/presenter";
import { startTour } from "../tour";
import { scenarios } from "../../app/startup";
import { setThemePreference } from "../../app/theme";
import { assets } from "../../data/assets";
import { genesisCollectibles } from "../../data/collectibles";
import { dapps } from "../../data/dapps";
import { displayCurrencyStore, type Currency } from "../../domain/money/display";
import type { Command } from "../../domain/palette/search";
import { assetPath, roomPath } from "../asset";
import { lockNow } from "../lock";
import { balancesHiddenStore } from "../privacy";

const titleCase = (key: string) => key.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase());

/** The asset a typed symbol means: Robinhood Chain first, since that is home. */
export function assetIdForSymbol(symbol: string): string | undefined {
  const matches = assets.filter((a) => a.symbol.toLowerCase() === symbol.toLowerCase());
  return (matches.find((a) => a.chain === "robinhood") ?? matches[0])?.id;
}

const go = (to: string) => ({ kind: "go", to }) as const;
const set = (apply: () => void) => ({ kind: "set", apply }) as const;

/** Every page, every asset and its rooms and earnings night, every site, setting and scenario. */
export function allCommands(): Command[] {
  const pages = destinations.map((d) => ({
    id: `page:${d.path}`,
    title: d.title,
    group: "Page",
    keywords: d.keywords,
    run: go(d.path),
  }));
  const assetPages = assets.map((a) => ({
    id: `asset:${a.id}`,
    title: `${a.symbol} · ${a.name}`,
    group: "Asset",
    keywords: a.kind,
    run: go(assetPath(a)),
  }));
  const stocks = assets.filter((a) => a.kind === "stock");
  const rooms = stocks.map((a) => ({
    id: `room:${a.id}`,
    title: `${a.symbol} holders' room`,
    group: "Room",
    keywords: "chat holders",
    run: go(roomPath(a)),
  }));
  const nights = stocks.map((a) => ({
    id: `night:${a.id}`,
    title: `${a.symbol} earnings night`,
    group: "Earnings",
    keywords: "report after hours",
    run: go(`/earnings/${a.id.replace(":", "-")}`),
  }));
  const items = genesisCollectibles.map((c) => ({
    id: `item:${c.id}`,
    title: c.name,
    group: "Collectible",
    keywords: "nft",
    run: go(`/collectibles/${c.id}`),
  }));
  const sites = dapps
    .filter((d) => d.listed)
    .map((d) => ({
      id: `site:${d.id}`,
      title: d.name,
      group: "App",
      keywords: d.origin,
      run: go(`/browse/${d.id}`),
    }));
  const themes = (["light", "dark", "system"] as const).map((t) => ({
    id: `theme:${t}`,
    title: `Theme: ${titleCase(t)}`,
    group: "Setting",
    keywords: "appearance mode",
    run: set(() => {
      setThemePreference(t);
    }),
  }));
  const currencies = (["USD", "EUR", "GBP"] as const).map((c: Currency) => ({
    id: `currency:${c}`,
    title: `Show money in ${c}`,
    group: "Setting",
    keywords: "currency display",
    run: set(() => {
      displayCurrencyStore.set(c);
    }),
  }));
  const toggles = [
    {
      id: "hide",
      title: "Hide or show balances",
      keywords: "privacy",
      apply: () => {
        balancesHiddenStore.set((v) => !v);
      },
    },
    {
      id: "small",
      title: "Hide or show small balances",
      keywords: "dust",
      apply: () => {
        hideSmallStore.set((v) => !v);
      },
    },
    {
      id: "haptics",
      title: "Turn haptics on or off",
      keywords: "vibration",
      apply: () => {
        hapticsOnStore.set((v) => !v);
      },
    },
    { id: "lock", title: "Lock the wallet now", keywords: "security", apply: lockNow },
    {
      id: "presenter",
      title: "Presenter mode",
      keywords: "demo pitch clock",
      apply: togglePresenter,
    },
    { id: "tour", title: "Take the tour", keywords: "guide walkthrough demo", apply: startTour },
  ].map((t) => ({
    id: `setting:${t.id}`,
    title: t.title,
    group: "Setting",
    keywords: t.keywords,
    run: set(t.apply),
  }));
  const shows = Object.keys(scenarios).map((key) => ({
    id: `scenario:${key}`,
    title: `Scenario: ${titleCase(key)}`,
    group: "Scenario",
    keywords: "demo presenter",
    run: { kind: "reload", to: `/?scenario=${key}` } as const,
  }));
  return [
    ...pages,
    ...assetPages,
    ...rooms,
    ...nights,
    ...items,
    ...sites,
    ...themes,
    ...currencies,
    ...toggles,
    ...shows,
  ];
}
