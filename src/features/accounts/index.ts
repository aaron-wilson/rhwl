// The accounts feature's public surface: what sibling features import. Nothing else.
export { AccountButton } from "./AccountButton";
export {
  accountsStore,
  findAccount,
  renameAccount,
  useAccounts,
  type AccountEntry,
} from "./accounts-store";
export {
  activeAccountStore,
  setActiveAccount,
  useActiveAccount,
  useActiveAccountEntry,
} from "./active-account";
