import { expect, test } from "@playwright/test";

test("fresh install: splash to Home with a claimed name", async ({ page }) => {
  const started = Date.now();
  await page.goto("/?scenario=fresh-install");
  await expect(page).toHaveURL(/\/welcome/);
  await page.getByRole("button", { name: "Create a wallet" }).click();
  await page.getByRole("button", { name: "Continue with passkey" }).click();
  await page.getByRole("button", { name: "Create passkey" }).click();
  await page.getByRole("textbox", { name: "Name" }).fill("stonks");
  await expect(page.getByText("Taken. Try stonks2.rh")).toBeVisible();
  await page.getByRole("button", { name: "Use stonks2.rh" }).click();
  await expect(page.getByText("stonks2.rh is yours to claim")).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Finish" }).click();
  await expect(page.getByRole("heading", { name: "Portfolio" })).toBeVisible();
  await expect(page.getByText("Welcome, stonks2.rh")).toBeVisible();
  expect(Date.now() - started).toBeLessThan(20_000);
});

test("the splash layer moves slower than the page when scrolled", async ({ page }) => {
  await page.goto("/welcome");
  const layer = page.locator(".parallax-layer");
  const before = await layer.evaluate((el) => el.getBoundingClientRect().top);
  await page.mouse.wheel(0, 400);
  await expect
    .poll(async () => layer.evaluate((el) => el.getBoundingClientRect().top))
    .toBeGreaterThan(before - 400);
});

test("without fresh-install, the demo opens straight on Home", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Portfolio" })).toBeVisible();
});

test("recovery phrase: hold to reveal, pass the quiz, claim a name", async ({ page }) => {
  await page.goto("/?scenario=fresh-install");
  await page.getByRole("button", { name: "Create a wallet" }).click();
  await page.getByRole("button", { name: "Create a recovery phrase" }).click();
  const grid = page.getByRole("button", { name: /Press and hold to reveal/ });
  const box = await grid.boundingBox();
  if (box === null) throw new Error("phrase grid not laid out");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await expect(page.getByTestId("phrase-word").first()).toHaveText(/^[a-z]+$/);
  const phrase = await page.getByTestId("phrase-word").allTextContents();
  await page.mouse.up();
  await expect(page.getByTestId("phrase-word").first()).toHaveText("•••••");
  await page.getByRole("button", { name: "I've written it down" }).click();
  for (const group of await page.getByRole("group", { name: /^Word #/ }).all()) {
    const legend = (await group.locator("legend").textContent()) ?? "";
    const position = Number(legend.replace(/\D/g, "")) - 1;
    await group.locator("label", { hasText: new RegExp(`^${phrase[position] ?? ""}$`) }).click();
  }
  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(page.getByRole("heading", { name: "Claim your name" })).toBeVisible();
});

test("import: a bad checksum is explained, a good phrase is accepted", async ({ page }) => {
  await page.goto("/?scenario=fresh-install");
  await page.getByRole("button", { name: "Create a wallet" }).click();
  await page.getByRole("button", { name: "Import a wallet" }).click();
  const box = page.getByRole("textbox");
  await box.fill(
    "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon walk",
  );
  await page.getByRole("button", { name: "Import" }).click();
  await expect(page.getByRole("alert")).toContainText("checksum doesn't match");
  await box.fill(
    "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
  );
  await page.getByRole("button", { name: "Import" }).click();
  await expect(page.getByRole("heading", { name: "Claim your name" })).toBeVisible();
});
