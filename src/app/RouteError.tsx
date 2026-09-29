import { useEffect } from "react";
import { Link, useNavigate, useRouteError } from "react-router";
import { Button } from "../ui/Button";
import { PageHeader } from "../ui/PageHeader";
import { useProviders } from "./providers-context";

/** Shown in place of a page that threw or whose code failed to load. The shell stays. */
export function RouteError() {
  const error = useRouteError();
  const navigate = useNavigate();
  const { reporter } = useProviders();
  useEffect(() => {
    reporter.report(error, "route");
  }, [error, reporter]);
  return (
    <div className="mx-auto flex max-w-content flex-col gap-4 px-4 sm:px-8">
      <PageHeader
        title="This page didn't load"
        subtitle="Something went wrong on our side. Your balances and activity are safe."
      />
      <div className="flex gap-3">
        <Button
          onClick={() => {
            void navigate(0);
          }}
        >
          Try again
        </Button>
        <Link to="/" className="self-center font-semibold text-accent">
          Go home
        </Link>
      </div>
    </div>
  );
}
