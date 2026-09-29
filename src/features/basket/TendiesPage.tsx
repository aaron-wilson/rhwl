import { ChevronLeft } from "lucide-react";
import { Link } from "react-router";
import { icon } from "../../ui/icon";
import { PageHeader } from "../../ui/PageHeader";
import { BasketBuy } from "./BasketBuy";
import { BasketMembers } from "./BasketMembers";
import { setWeights, useBasket } from "./basket-store";
import { RebalanceCard } from "./RebalanceCard";

/** Build a basket by weight, buy it in one signature, and keep it on target. */
export function TendiesPage() {
  const basket = useBasket();
  return (
    <div className="mx-auto flex max-w-phone flex-col gap-6 px-4 pt-4 pb-8">
      <Link
        to="/trade"
        className="-ml-1 flex items-center gap-1 self-start rounded-md text-body font-semibold text-accent"
      >
        <ChevronLeft {...icon()} />
        Trade
      </Link>
      <PageHeader
        title={basket.name}
        subtitle="Stock Tokens, crypto and memes by weight, bought as one"
      />
      <BasketMembers weights={basket.weights} onChange={setWeights} />
      <BasketBuy name={basket.name} weights={basket.weights} />
      {basket.bought && <RebalanceCard name={basket.name} weights={basket.weights} />}
    </div>
  );
}
