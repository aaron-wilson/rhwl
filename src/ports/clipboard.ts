/** Puts text on the system clipboard. Throws a PortError when the browser refuses. */
export interface Clipboard {
  copy(text: string): Promise<void>;
}
