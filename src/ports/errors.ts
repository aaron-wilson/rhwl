/** The one error type every adapter throws, whatever the underlying API raised. */
export class PortError extends Error {
  readonly port: string;
  readonly reason: "unavailable" | "denied" | "failed";

  constructor(
    port: string,
    reason: PortError["reason"],
    message: string,
    options?: { cause?: unknown },
  ) {
    super(`${port}: ${message}`, options);
    this.name = "PortError";
    this.port = port;
    this.reason = reason;
  }
}
