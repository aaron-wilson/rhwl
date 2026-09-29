import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { hardwareAccount } from "../../data/accounts";
import {
  accountsStore,
  addAccount,
  moveAccount,
  renameAccount,
  setAccountHidden,
} from "./accounts-store";
import { activeAccountStore, hideAccount, setActiveAccount } from "./active-account";
import { AccountSheet } from "./AccountSheet";
import { accountSheetStore } from "./account-sheet-store";

const ids = () => accountsStore.get().map((a) => a.id);

describe("accounts store", () => {
  it("renames with trimming and rejects empty or long names", () => {
    renameAccount("degen", "  Moon bag  ");
    expect(accountsStore.get()[1]?.name).toBe("Moon bag");
    expect(() => {
      renameAccount("degen", "   ");
    }).toThrow(/1 to 24/);
    expect(() => {
      renameAccount("degen", "x".repeat(25));
    }).toThrow(/1 to 24/);
  });

  it("reorders, ignoring moves past either end", () => {
    moveAccount("degen", -1);
    expect(ids()).toEqual(["degen", "main"]);
    moveAccount("degen", -1);
    expect(ids()).toEqual(["degen", "main"]);
  });

  it("hides an account, moves the active account away from it, and never hides the last one", () => {
    setActiveAccount("degen");
    hideAccount("degen");
    expect(activeAccountStore.get()).toBe("main");
    expect(() => {
      setAccountHidden("main", true);
    }).toThrow(/must stay visible/);
  });

  it("adds an account once", () => {
    addAccount(hardwareAccount);
    addAccount(hardwareAccount);
    expect(ids()).toEqual(["main", "degen", "ledger"]);
  });

  it("rejects unknown accounts", () => {
    expect(() => {
      setActiveAccount("nobody");
    }).toThrow(/Unknown account/);
  });
});

describe("account sheet", () => {
  it("switches accounts and closes", async () => {
    accountSheetStore.set(true);
    render(<AccountSheet />);
    await userEvent.click(screen.getByRole("button", { name: /Degen/ }));
    expect(activeAccountStore.get()).toBe("degen");
    expect(accountSheetStore.get()).toBe(false);
  });

  it("edits: rename, reorder, hide and show again", async () => {
    render(<AccountSheet />);
    await userEvent.click(screen.getByRole("button", { name: "Edit accounts" }));
    const name = screen.getByRole("textbox", { name: "Name for Degen" });
    await userEvent.clear(name);
    await userEvent.type(name, "Moon bag");
    await userEvent.tab();
    expect(accountsStore.get()[1]?.name).toBe("Moon bag");
    await userEvent.click(screen.getByRole("button", { name: "Move Moon bag up" }));
    expect(ids()).toEqual(["degen", "main"]);
    await userEvent.click(screen.getAllByRole("button", { name: "Hide" })[0] ?? document.body);
    expect(screen.getByRole("region", { name: "Hidden accounts" })).toHaveTextContent("Moon bag");
    await userEvent.click(screen.getByRole("button", { name: "Show Moon bag" }));
    expect(accountsStore.get().every((a) => !a.hidden)).toBe(true);
  });
});
