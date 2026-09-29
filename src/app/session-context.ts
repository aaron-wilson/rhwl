import { createContext, useContext } from "react";
import type { Session } from "./session";

export const SessionContext = createContext<Session | undefined>(undefined);

export function useSession(): Session {
  const session = useContext(SessionContext);
  if (session === undefined) throw new Error("useSession needs a SessionContext above it");
  return session;
}
