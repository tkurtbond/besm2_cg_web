// Phase 9: the Weapon Attack dialog in a real browser, headless. A Weapon
// Attack added, its dialog opened with Weapon..., an Ability added with
// its slots and both its pages, the damage following, OK keeping it and
// Save downloading it; a second opening cancelled with Escape.
// test/ui/weapon.test.ts checks the rest on happy-dom.

import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { PAGE_URL, watch } from "./page.ts";

test("the Weapon dialog: an Ability, OK, Save; Escape cancels", async ({
  page,
}) => {
  const w = watch(page);
  await page.goto(PAGE_URL);
  await page.getByRole("tab", { name: "Attributes" }).click();
  const attrs = page.getByRole("tabpanel", { name: "Attributes" });
  await attrs
    .getByRole("combobox", { name: "Attributes: name" })
    .selectOption({ label: "Weapon Attack (p. 81, PDF 83)" });
  await attrs.getByRole("spinbutton", { name: "Level" }).fill("4");
  await attrs.getByRole("textbox", { name: "subject" }).fill("Sword");
  await attrs.getByRole("button", { name: "Add", exact: true }).click();
  const lines = attrs.getByRole("listbox", { name: "Attributes", exact: true });
  await expect(lines.getByRole("option").first()).toContainText(
    "4 Weapon Attack: Sword",
  );

  await attrs.getByRole("button", { name: "Weapon..." }).click();
  const dialog = page.locator("dialog.weapon-dialog[open]");
  await expect(dialog).toContainText("Weapon Attack (p. 81, PDF 83)");
  const damage = dialog.getByRole("textbox", { name: "damage override" });
  await expect(
    dialog.getByRole("checkbox", { name: "the primary attack" }),
  ).toBeDisabled();
  await dialog
    .getByRole("combobox", { name: "Abilities: name", exact: true })
    .selectOption({ label: "Accurate (p. 83, PDF 85)" });
  await dialog
    .getByRole("button", { name: "Add", exact: true })
    .first()
    .click();
  const abilities = dialog.getByRole("listbox", {
    name: "Abilities",
    exact: true,
  });
  await expect(abilities.getByRole("option")).toHaveCount(1);
  await expect(abilities.getByRole("option").first()).toContainText("Accurate");
  await expect(abilities.getByRole("option").first()).toContainText(
    "p. 83, PDF 85",
  );
  await expect(damage).toHaveValue("");
  await expect(dialog).toContainText("45");
  await dialog.getByRole("button", { name: "OK", exact: true }).click();
  await expect(page.locator("dialog[open]")).toHaveCount(0);
  await expect(page).toHaveTitle(/ \*$/);

  const download = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: "File" }).click();
  await page.getByRole("menuitem", { name: /^Save\b(?!\s*As)/ }).click();
  // A new character has no file's name yet: Save asks for one.
  const ask = page.locator("dialog[open]");
  await expect(ask).toContainText("Save the characters as:");
  await ask.getByRole("textbox").fill("weapon.yaml");
  await ask.getByRole("button", { name: "OK", exact: true }).click();
  const saved = readFileSync(await (await download).path(), "utf8");
  expect(saved).toContain("Weapon Attack");
  expect(saved).toMatch(/abilities:/);
  expect(saved).toContain("Accurate");

  await attrs.getByRole("button", { name: "Weapon..." }).click();
  await expect(dialog).toHaveCount(1);
  const level = dialog.getByRole("spinbutton", { name: "Level" });
  await level.fill("6");
  await level.press("Tab");
  await expect(lines.getByRole("option").first()).toContainText(
    "6 Weapon Attack: Sword",
  );
  await page.keyboard.press("Escape");
  await expect(page.locator("dialog[open]")).toHaveCount(0);
  await expect(lines.getByRole("option").first()).toContainText(
    "4 Weapon Attack: Sword",
  );
  await expect(page).not.toHaveTitle(/ \*$/);
  expect(w.requests).toEqual([]);
  expect(w.errors).toEqual([]);
});
