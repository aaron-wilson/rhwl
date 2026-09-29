import { Moon } from "lucide-react";
import { useNow } from "../../app/useNow";
import { assetById } from "../../data/assets";
import { isEarningsNight } from "../../domain/earnings/earnings";
import { icon } from "../../ui/icon";
import { NavCard } from "../../ui/NavCard";
import { useActiveAccount } from "../accounts";
import { useEarningsCalendar } from "./useEarnings";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** On Home: tonight's report, or the next one within a week. Hidden otherwise. */
export function EarningsCard() {
  const now = useNow(60_000);
  const [next] = useEarningsCalendar(useActiveAccount(), now);
  if (next === undefined) return null;
  const symbol = assetById(next.assetId).symbol;
  const slug = next.assetId.replace(":", "-");
  if (isEarningsNight(next.date, now)) {
    return (
      <div className="flex flex-col gap-1">
        <span className="flex items-center gap-1 px-1 text-footnote font-semibold text-live">
          <Moon {...icon()} /> Earnings night
        </span>
        <NavCard
          to={`/earnings/${slug}`}
          title={`${symbol} reports tonight`}
          subtitle="Your token, paired memes and perps, live"
        />
      </div>
    );
  }
  if (new Date(`${next.date}T12:00:00Z`).getTime() - now.getTime() > WEEK_MS) return null;
  return (
    <NavCard
      to="/earnings"
      title={`${symbol} reports ${next.date}`}
      subtitle="See everything riding on it"
    />
  );
}
