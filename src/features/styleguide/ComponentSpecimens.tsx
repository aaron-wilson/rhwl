import { ButtonSpecimens } from "./ButtonSpecimens";
import { ControlSpecimens } from "./ControlSpecimens";
import { IdentitySpecimens } from "./IdentitySpecimens";
import { OverlaySpecimens } from "./OverlaySpecimens";
import { RowSpecimens } from "./RowSpecimens";
import type { Theme } from "./Section";

export function ComponentSpecimens({ theme }: { readonly theme: Theme }) {
  return (
    <>
      <ButtonSpecimens />
      <ControlSpecimens theme={theme} />
      <RowSpecimens />
      <IdentitySpecimens />
      <OverlaySpecimens />
    </>
  );
}
