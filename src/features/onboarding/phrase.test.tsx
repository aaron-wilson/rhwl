import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";
import { hydrate } from "../../app/persistence";
import { ProvidersContext } from "../../app/providers-context";
import { quizFor } from "../../domain/keys/quiz";
import { testProviders } from "../../test/providers";
import { needsOnboardingStore } from "./onboarding-store";
import { WelcomePage } from "./WelcomePage";

const words = readFileSync(join(process.cwd(), "src/data/bip39-english.txt"), "utf8")
  .trim()
  .split("\n");

function mount() {
  const providers = testProviders();
  const stopPersisting = hydrate(providers.storage);
  needsOnboardingStore.set(true);
  const router = createMemoryRouter(
    [
      { path: "/welcome", element: <WelcomePage /> },
      { path: "/", element: <p>Home</p> },
    ],
    { initialEntries: ["/welcome"] },
  );
  render(
    <ProvidersContext.Provider value={providers}>
      <RouterProvider router={router} />
    </ProvidersContext.Provider>,
  );
  return { providers, stopPersisting };
}

async function toMethod() {
  await userEvent.click(screen.getByRole("button", { name: "Create a wallet" }));
}

describe("recovery phrase path", () => {
  it("reveals only while held, fails a wrong quiz, passes the right one, and never stores a word", async () => {
    const { providers, stopPersisting } = mount();
    await toMethod();
    await userEvent.click(screen.getByRole("button", { name: "Create a recovery phrase" }));
    const grid = screen.getByRole("button", { name: /Press and hold to reveal/ });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "I've written it down" })).toBeDisabled();
    });
    expect(grid).not.toHaveTextContent(/[a-z]{3,}/);
    fireEvent.pointerDown(grid);
    await waitFor(() => {
      expect(screen.getAllByTestId("phrase-word")[0]?.textContent).toMatch(/^[a-z]+$/);
    });
    const phrase = screen.getAllByTestId("phrase-word").map((el) => el.textContent);
    fireEvent.pointerUp(grid);
    expect(screen.getAllByTestId("phrase-word")[0]).toHaveTextContent("•••••");
    await userEvent.click(screen.getByRole("button", { name: "I've written it down" }));

    const quiz = quizFor(phrase);
    for (const q of quiz) {
      const wrong = q.choices.find((c) => c !== phrase[q.position]) ?? "";
      await userEvent.click(within(q.position, wrong));
    }
    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(screen.getByRole("alert")).toHaveTextContent("doesn't match your phrase");
    for (const q of quiz) await userEvent.click(within(q.position, phrase[q.position] ?? ""));
    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(await screen.findByRole("heading", { name: "Claim your name" })).toBeInTheDocument();

    // Persist a preference change, then check nothing of the phrase reached storage.
    act(() => {
      providers.storage.set("probe", "x");
    });
    const stored = ["rhwl:v1", "probe"].map((key) => providers.storage.get(key) ?? "").join(" ");
    phrase.forEach((word) => {
      expect(stored).not.toContain(word);
    });
    stopPersisting();
  });
});

function within(position: number, choice: string): HTMLElement {
  const group = screen.getByRole("group", { name: `Word #${position + 1}` });
  const input = [...group.querySelectorAll("input")].find((el) => el.value === choice);
  if (input === undefined) throw new Error(`No choice ${choice}`);
  return input;
}

describe("import path", () => {
  it.each([
    ["Phrase", "abandon abandon", /12 or 24 words/],
    [
      "Phrase",
      "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon walk",
      /checksum/,
    ],
    ["Private key", "0x1234", /64 hexadecimal/],
    ["Watch", "0x8f3a41c2", /address \(0x and 40 characters, checksum intact\)/],
  ])("%s: %j is rejected precisely", async (mode, input, reason) => {
    mount();
    await toMethod();
    await userEvent.click(screen.getByRole("button", { name: "Import a wallet" }));
    await userEvent.click(screen.getByText(mode, { selector: "span" }));
    await userEvent.type(screen.getByRole("textbox"), input);
    await userEvent.click(screen.getByRole("button", { name: "Import" }));
    // The check loads the word list lazily and hashes with crypto.subtle; the alert
    // region can exist before its message, so wait for the text, not the element.
    await waitFor(
      () => {
        expect(screen.getByRole("alert")).toHaveTextContent(reason);
      },
      { timeout: 5_000 },
    );
  });

  it("suggests words as you type and imports a valid phrase", async () => {
    mount();
    await toMethod();
    await userEvent.click(screen.getByRole("button", { name: "Import a wallet" }));
    const box = screen.getByRole("textbox");
    await userEvent.type(box, "zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo wro");
    await userEvent.click(await screen.findByRole("button", { name: "wrong" }));
    expect(box).toHaveValue("zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo wrong ");
    expect(words).toContain("wrong");
    await userEvent.click(screen.getByRole("button", { name: "Import" }));
    expect(await screen.findByRole("heading", { name: "Claim your name" })).toBeInTheDocument();
  });
});
