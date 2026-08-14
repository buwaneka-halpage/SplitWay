import { expect, test, type Page } from "@playwright/test"

async function clickTab(page: Page, testId: string) {
  // ponytail: Pixel 5 viewport — Next overlay can eat the bottom 44px; force still hits the tab.
  await page.getByTestId(testId).click({ force: true })
}

async function startGroup(page: Page, name = "Trip") {
  await page.getByTestId("group-name").fill(name)
  await page.getByTestId("group-add").click()
  await page.getByTestId(`group-${name}`).click()
  await expect(page.getByTestId("tab-people")).toBeVisible()
}

async function addPerson(page: Page, name: string) {
  await clickTab(page, "tab-people")
  await page.getByTestId("person-name").fill(name)
  await page.getByTestId("person-add").click()
  await expect(page.getByTestId(`person-${name}`)).toBeVisible()
}

async function openExpenses(page: Page) {
  await clickTab(page, "tab-expenses")
  await expect(page.getByTestId("expense-amount")).toBeVisible()
}

async function setParticipants(page: Page, names: string[]) {
  const boxes = page.locator('[data-testid^="participant-"]')
  const count = await boxes.count()
  for (let i = 0; i < count; i++) {
    const box = boxes.nth(i)
    const id = (await box.getAttribute("data-testid")) ?? ""
    const name = id.replace("participant-", "")
    const should = names.includes(name)
    const on =
      (await box.getAttribute("aria-checked")) === "true" ||
      (await box.isChecked().catch(() => false))
    if (should !== on) await box.click()
  }
}

test.beforeEach(async ({ page }) => {
  await page.goto("/")
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await expect(page.getByRole("heading", { name: "SplitWay" })).toBeVisible()
})

test("AT-01: Alice Bob Carol Dave balances sum to zero and settle-up is minimized", async ({
  page,
}) => {
  await startGroup(page)
  for (const name of ["Alice", "Bob", "Carol", "Dave"]) {
    await addPerson(page, name)
  }
  await openExpenses(page)

  await page.getByTestId("expense-amount").fill("12000")
  await page.getByTestId("expense-payer").selectOption({ label: "Alice" })
  await setParticipants(page, ["Alice", "Bob", "Carol", "Dave"])
  await page.getByTestId("split-equal").check()
  await page.getByTestId("expense-submit").click()
  await expect(page.getByText("Rs. 12,000.00 paid by Alice")).toBeVisible()

  await page.getByTestId("expense-amount").fill("10000")
  await page.getByTestId("expense-payer").selectOption({ label: "Carol" })
  await setParticipants(page, ["Alice", "Bob", "Dave"])
  await page.getByTestId("split-exact").check()
  await page.getByTestId("exact-Alice").fill("3333.33")
  await page.getByTestId("exact-Bob").fill("3333.33")
  await page.getByTestId("exact-Dave").fill("3333.34")
  await page.getByTestId("expense-submit").click()
  await expect(page.getByText("Rs. 10,000.00 paid by Carol")).toBeVisible()

  await page.getByTestId("expense-amount").fill("6000")
  await page.getByTestId("expense-payer").selectOption({ label: "Dave" })
  await setParticipants(page, ["Dave", "Bob"])
  await page.getByTestId("split-equal").check()
  await page.getByTestId("expense-submit").click()
  await expect(page.getByText("Rs. 6,000.00 paid by Dave")).toBeVisible()

  await clickTab(page, "tab-balances")
  await expect(page.getByTestId("balance-sum")).toHaveText("Sum: Rs. 0.00")
  await expect(page.getByTestId("balance-Alice")).toContainText("Rs. 5,666.67")
  await expect(page.getByTestId("balance-Bob")).toContainText("-Rs. 9,333.33")
  await expect(page.getByTestId("balance-Carol")).toContainText("Rs. 7,000.00")
  await expect(page.getByTestId("balance-Dave")).toContainText("-Rs. 3,333.34")

  await clickTab(page, "tab-settle")
  const rows = page.getByTestId("settle-row")
  await expect(rows).toHaveCount(3)
  await expect(page.getByTestId("settle-up")).not.toContainText("pairwise")
})

test("Rs. 100 equal among 3 people shows a zero balance sum", async ({ page }) => {
  await startGroup(page)
  for (const name of ["Ann", "Bea", "Cam"]) await addPerson(page, name)
  await openExpenses(page)
  await page.getByTestId("expense-amount").fill("100")
  await page.getByTestId("expense-description").fill("Snacks")
  await page.getByTestId("expense-payer").selectOption({ label: "Ann" })
  await setParticipants(page, ["Ann", "Bea", "Cam"])
  await page.getByTestId("expense-submit").click()
  await expect(page.getByText("Snacks")).toBeVisible()
  await clickTab(page, "tab-balances")
  await expect(page.getByTestId("balance-sum")).toHaveText("Sum: Rs. 0.00")
})

test("exact amounts that do not sum are rejected and not saved", async ({ page }) => {
  await startGroup(page)
  await addPerson(page, "Ann")
  await addPerson(page, "Bea")
  await openExpenses(page)
  await page.getByTestId("expense-amount").fill("100")
  await page.getByTestId("expense-payer").selectOption({ label: "Ann" })
  await page.getByTestId("participant-Ann").check()
  await page.getByTestId("participant-Bea").check()
  await page.getByTestId("split-exact").check()
  await page.getByTestId("exact-Ann").fill("40")
  await page.getByTestId("exact-Bea").fill("40")
  await page.getByTestId("expense-submit").click()
  await expect(page.getByTestId("form-error")).toContainText("sum")
  await expect(page.getByText("No expenses yet.")).toBeVisible()
})

test("edit and delete recalculate balances; reload restores the session", async ({
  page,
}) => {
  await startGroup(page)
  await addPerson(page, "Ann")
  await addPerson(page, "Bea")
  await openExpenses(page)
  await page.getByTestId("expense-amount").fill("100")
  await page.getByTestId("expense-description").fill("Lunch")
  await page.getByTestId("expense-payer").selectOption({ label: "Ann" })
  await page.getByTestId("participant-Ann").check()
  await page.getByTestId("participant-Bea").check()
  await page.getByTestId("expense-submit").click()
  await clickTab(page, "tab-balances")
  await expect(page.getByTestId("balance-Ann")).toContainText("Rs. 50.00")

  await clickTab(page, "tab-expenses")
  await expect(page.getByText("Lunch")).toBeVisible()
  await page.getByRole("button", { name: "Edit" }).click()
  await expect(page.getByTestId("expense-description")).toHaveValue("Lunch")
  await page.getByTestId("expense-amount").fill("200")
  await page.getByTestId("expense-submit").click()
  await expect(page.getByText("Lunch")).toBeVisible()
  await clickTab(page, "tab-balances")
  await expect(page.getByTestId("balance-Ann")).toContainText("Rs. 100.00")
  await expect(page.getByTestId("balance-sum")).toHaveText("Sum: Rs. 0.00")

  await page.reload()
  await clickTab(page, "tab-people")
  await expect(page.getByTestId("person-Ann")).toBeVisible()
  await clickTab(page, "tab-balances")
  await expect(page.getByTestId("balance-Ann")).toContainText("Rs. 100.00")

  await clickTab(page, "tab-expenses")
  await page.getByRole("button", { name: "Delete", exact: true }).click()
  await expect(page.getByText("Lunch")).toBeVisible()
  await page.getByTestId("expense-delete-confirm").click()
  await expect(page.getByText("No expenses yet.")).toBeVisible()
  await clickTab(page, "tab-balances")
  await expect(page.getByTestId("balance-Ann")).toContainText("Rs. 0.00")
})

test("date, split-all, last payer/participants, and exact remainder", async ({
  page,
}) => {
  await startGroup(page)
  await addPerson(page, "Ann")
  await addPerson(page, "Bea")
  await openExpenses(page)

  await expect(page.getByTestId("expense-date")).toHaveValue(/^\d{4}-\d{2}-\d{2}$/)
  await page.getByTestId("expense-date").fill("2026-01-15")
  await page.getByTestId("expense-amount").fill("100")
  await page.getByTestId("expense-payer").selectOption({ label: "Ann" })
  await page.getByTestId("split-all").click()
  await expect(page.getByTestId("participant-Ann")).toBeChecked()
  await expect(page.getByTestId("participant-Bea")).toBeChecked()
  await page.getByTestId("expense-submit").click()
  await expect(page.getByText("2026-01-15")).toBeVisible()

  await expect(page.getByTestId("expense-payer").locator("option:checked")).toHaveText(
    "Ann",
  )
  await expect(page.getByTestId("participant-Ann")).toBeChecked()
  await expect(page.getByTestId("participant-Bea")).toBeChecked()

  await page.getByTestId("expense-amount").fill("100")
  await page.getByTestId("split-exact").check()
  await page.getByTestId("exact-Ann").fill("40")
  await page.getByTestId("exact-Bea").fill("40")
  await expect(page.getByTestId("exact-remainder")).toContainText("left to assign")
  await page.getByTestId("expense-submit").click()
  await expect(page.getByTestId("form-error")).toContainText("sum")
})

test("rename group and person; group card shows who is owed most", async ({
  page,
}) => {
  await startGroup(page, "Trip")
  await addPerson(page, "Ann")
  await addPerson(page, "Bea")
  await openExpenses(page)
  await page.getByTestId("expense-amount").fill("100")
  await page.getByTestId("expense-payer").selectOption({ label: "Ann" })
  await page.getByTestId("split-all").click()
  await page.getByTestId("expense-submit").click()

  await clickTab(page, "tab-people")
  await page.getByTestId("person-rename-Ann").click()
  await page.getByTestId("person-rename-input").fill("Anna")
  await page.getByTestId("person-rename-save").click()
  await expect(page.getByTestId("person-Anna")).toBeVisible()

  await page.getByRole("link", { name: "Back to groups" }).click()
  await expect(page.getByTestId("group-owed-Trip")).toContainText("Anna is owed")
  await page.getByTestId("group-rename-Trip").click()
  await page.getByTestId("group-rename-input").fill("Weekend")
  await page.getByTestId("group-rename-save").click()
  await expect(page.getByTestId("group-Weekend")).toBeVisible()
  await expect(page.getByTestId("group-owed-Weekend")).toContainText("Anna is owed")
})

test("tick a settle transfer done; reload keeps the tick; balances stay put", async ({
  page,
}) => {
  await startGroup(page)
  await addPerson(page, "Ann")
  await addPerson(page, "Bea")
  await openExpenses(page)
  await page.getByTestId("expense-amount").fill("100")
  await page.getByTestId("expense-payer").selectOption({ label: "Ann" })
  await page.getByTestId("split-all").click()
  await page.getByTestId("expense-submit").click()

  await clickTab(page, "tab-settle")
  const row = page.getByTestId("settle-row")
  await expect(row).toHaveCount(1)
  await row.getByTestId("settle-done").check()
  await expect(row.getByTestId("settle-done")).toBeChecked()

  await page.reload()
  await clickTab(page, "tab-settle")
  await expect(page.getByTestId("settle-row").getByTestId("settle-done")).toBeChecked()
  await clickTab(page, "tab-balances")
  await expect(page.getByTestId("balance-Ann")).toContainText("Rs. 50.00")
})

test("export and import restore groups; delete group asks first", async ({
  page,
}) => {
  await startGroup(page, "Trip")
  await addPerson(page, "Ann")
  await page.getByRole("link", { name: "Back to groups" }).click()

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByTestId("groups-export").click(),
  ])
  expect(download.suggestedFilename()).toBe("splitway-groups.json")

  await page.getByTestId("group-delete-Trip").click()
  await expect(page.getByTestId("group-Trip")).toBeVisible()
  await page.getByTestId("group-delete-confirm").click()
  await expect(page.getByText("No groups yet.")).toBeVisible()

  await page.getByTestId("groups-import").setInputFiles({
    name: "splitway-groups.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        groups: [
          {
            id: "imported",
            name: "Imported",
            people: [{ id: "a", name: "Ann" }],
            expenses: [],
          },
        ],
      }),
    ),
  })
  await expect(page.getByTestId("group-Imported")).toBeVisible()
})

test("groups keep people and expenses separate", async ({ page }) => {
  await startGroup(page, "Trip")
  await addPerson(page, "Ann")
  await openExpenses(page)
  await page.getByTestId("expense-amount").fill("100")
  await page.getByTestId("expense-payer").selectOption({ label: "Ann" })
  await page.getByTestId("participant-Ann").check()
  await page.getByTestId("expense-submit").click()

  await page.getByRole("link", { name: "Back to groups" }).click()
  await startGroup(page, "House")
  await expect(page.getByTestId("person-Ann")).toHaveCount(0)
  await addPerson(page, "Bea")
  await clickTab(page, "tab-expenses")
  await expect(page.getByText("No expenses yet.")).toBeVisible()
})
