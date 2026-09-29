/** Where unexpected errors go, such as a page that threw. Nothing in the app calls `console` itself. */
export interface Reporter {
  report(error: unknown, where: string): void;
}
