export interface SharePayload {
  readonly title: string;
  readonly text: string;
  readonly url?: string;
  /** Files to attach, such as an image; dropped where the platform can't share files. */
  readonly files?: readonly File[];
}

export type ShareResult = "shared" | "copied" | "cancelled";

/** The system share sheet when there is one, otherwise the clipboard. */
export interface Share {
  share(payload: SharePayload): Promise<ShareResult>;
}
