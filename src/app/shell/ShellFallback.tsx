import { Skeleton } from "../../ui/Skeleton";

/** Shown only while the first route's code loads. Shaped like a page header. */
export function ShellFallback() {
  return (
    <div className="mx-auto flex max-w-content flex-col gap-4 p-6" aria-busy="true">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-14 w-64" />
    </div>
  );
}
