import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ProvidersContext } from "../../app/providers-context";
import { hardwareAccount } from "../../data/accounts";
import { verifyMessage } from "../../domain/keys/signature";
import { testProviders } from "../../test/providers";
import { addAccount } from "../accounts/accounts-store";
import { signMessageAs } from "./sign-message";
import { approveEveryMessage, signerStore } from "./signer";
import { SignerHost } from "./SignerHost";

const endAnimation = (element: HTMLElement) => {
  fireEvent(element, new Event("webkitAnimationEnd", { bubbles: true }));
};
const message = { payload: '{"v":1,"claim":"holds NVDA"}', display: "I hold NVDA" };

function mount() {
  return render(
    <ProvidersContext.Provider value={testProviders()}>
      <SignerHost />
    </ProvidersContext.Provider>,
  );
}

describe("message signing", () => {
  it("approves every message with no sheet mounted, and the sheet takes over when it is", () => {
    expect(signerStore.get().approveMessage).toBe(approveEveryMessage);
    const { unmount } = mount();
    expect(signerStore.get().approveMessage).not.toBe(approveEveryMessage);
    unmount();
    expect(signerStore.get().approveMessage).toBe(approveEveryMessage);
  });

  it("shows exactly what is signed, then returns a signature that verifies", async () => {
    mount();
    const done = signMessageAs("main", message);
    const sheet = await screen.findByRole("dialog", { name: "Sign message" });
    expect(sheet).toHaveTextContent("This moves no funds");
    expect(screen.getByLabelText("Message")).toHaveTextContent("I hold NVDA");
    await userEvent.click(screen.getByRole("button", { name: "Confirm with passkey" }));
    endAnimation(screen.getByTestId("sign-scan"));
    const signed = await done;
    expect(signed?.payload).toBe(message.payload);
    expect(verifyMessage(message.payload, signed?.signature ?? "", signed?.signer ?? "")).toBe(
      true,
    );
  });

  it("resolves undefined when the sheet is closed", async () => {
    mount();
    const done = signMessageAs("main", message);
    await screen.findByRole("dialog", { name: "Sign message" });
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(await done).toBeUndefined();
  });

  it("asks a hardware account to confirm on its device", async () => {
    addAccount(hardwareAccount);
    mount();
    const done = signMessageAs(hardwareAccount.id, message);
    await screen.findByRole("dialog", { name: "Confirm on device" });
    expect(screen.getByText("Sign message?")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Reject on device" }));
    await act(async () => {
      expect(await done).toBeUndefined();
    });
  });
});
