// The privacy feature's public surface: what sibling features import. Nothing else.
export { Private } from "./Private";
export {
  balancesHiddenStore,
  setBalancesHidden,
  toggleBalancesHidden,
  useBalancesHidden,
} from "./privacy";
