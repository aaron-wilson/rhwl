import { Button } from "../../ui/Button";
import { framedUrl, setPhoneFrame } from "../presenter";

/**
 * The app at phone size, for sharing a desktop screen. A frame is the only
 * honest way: the layout follows the viewport, so shrinking a container would
 * still show the desktop layout. The framed app has its own presenter bar.
 */
export function PhoneFrame() {
  return (
    <div className="flex min-h-dvh flex-col items-center gap-4 bg-canvas p-6">
      <Button
        size="sm"
        variant="secondary"
        onClick={() => {
          setPhoneFrame(false);
        }}
      >
        Leave phone frame
      </Button>
      <iframe
        title="Wallet on a phone"
        src={framedUrl(window.location)}
        style={{ width: "var(--rh-device-width)", height: "var(--rh-device-height)" }}
        className="shrink-0 rounded-xl border-8 border-ink shadow-lg"
      />
    </div>
  );
}
