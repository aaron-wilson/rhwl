import { Link } from "react-router";
import { PageHeader } from "../ui/PageHeader";

export function NotFoundPage() {
  return (
    <div className="mx-auto flex max-w-content flex-col gap-4 px-4 sm:px-8">
      <PageHeader
        title="Nothing here"
        subtitle="This address doesn't lead anywhere in the wallet."
      />
      <Link to="/" className="self-start font-semibold text-accent">
        Back to Home
      </Link>
    </div>
  );
}
