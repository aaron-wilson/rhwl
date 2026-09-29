import { useBalancesHidden } from "./privacy";

/** Renders a money amount, or a mask that screen readers announce as "Hidden amount". */
export function Private({ children }: { readonly children: string }) {
  const hidden = useBalancesHidden();
  if (!hidden) return <>{children}</>;
  return (
    <span data-private="masked">
      <span aria-hidden="true">••••••</span>
      <span className="sr-only">Hidden amount</span>
    </span>
  );
}
