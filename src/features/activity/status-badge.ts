/** How a transaction's status reads as a badge, everywhere activity is listed. */
export const statusBadge = {
  pending: { tone: "live", text: "Pending" },
  confirmed: { tone: "neutral", text: "Confirmed" },
  failed: { tone: "loss", text: "Failed" },
} as const;
