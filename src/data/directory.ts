/**
 * Names the demo resolves to addresses: `.rh` names and ENS-style `.eth`
 * names. Every name and address here is fictional.
 */
export const nameDirectory: Readonly<Record<string, string>> = {
  "stonks.rh": "0x7a2c9e41b0d35f86a2c417e9d0b3a8f6c21e3f19",
  "tendies.rh": "0x5d0e3b8a1c7f29e4d6b0a5c3e8f1d7b2a9c46e0b",
  "diamondhands.rh": "0x2b9f7c1e4a0d8b3e6f5c2a9d1e7b4c8f0a3d51c7",
  "yolo.eth": "0x9c4e1a7b3d5f0e8c2b6a4d9f1e3c7b5a0d8e62f4",
};

/** Looks up a normalized name ("stonks.rh"); undefined when nobody uses it. */
export function addressForName(name: string): string | undefined {
  return nameDirectory[name];
}

/** The name behind an address, when the directory knows one. */
export function nameForAddress(address: string): string | undefined {
  const lower = address.toLowerCase();
  return Object.entries(nameDirectory).find(([, a]) => a.toLowerCase() === lower)?.[0];
}
