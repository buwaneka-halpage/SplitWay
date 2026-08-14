import { expect, test, type Page } from "@playwright/test"

async function addPerson(page: Page, name: string) {
  await page.getByTestId("person-name").fill(name)
  await page.getByTestId("person-add").click()
  await expect(page.getByTestId(`person-${name}`)).toBeVisible()
}

async function setParticipants(page: Page, names: string[]) {
  const boxes = page.locator('[data-testid^="participant-"]')
  const count = await boxes.count()
  for (let i = 0; i < count; i++) {
    const box = boxes.nth(i)
    const id = (await box.getAttribute("data-testid")) ?? ""
    const name = id.replace("participant-", "")
    const should = names.includes(name)
    const on = (await box.getAttribute("aria-checked")) === "true" || (await box.isChecked().catch(() => false))
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
  for (const name of ["Alice", "Bob", "Carol", "Dave"]) {
    await addPerson(page, name)
  }

  await page.getByTestId("expense-amount").fill("12000")
  await page.getByTestId("expense-payer").selectOption({ label: "Alice" })
  await setParticipants(page, ["Alice", "Bob", "Carol", "Dave"])
  await page.getByTestId("split-equal").click()
  await page.getByTestId("expense-submit").click()
  await expect(page.getByText("Rs. 12,000.00 paid by Alice")).toBeVisible()

  await page.getByTestId("expense-amount").fill("10000")
  await page.getByTestId("expense-payer").selectOption({ label: "Carol" })
  await setParticipants(page, ["Alice", "Bob", "Dave"])
  await page.getByTestId("split-exact").click()
  await page.getByTestId("exact-Alice").fill("3333.33")
  await page.getByTestId("exact-Bob").fill("3333.33")
  await page.getByTestId("exact-Dave").fill("3333.34")
  await page.getByTestId("expense-submit").click()
  await expect(page.getByText("Rs. 10,000.00 paid by Carol")).toBeVisible()

  await page.getByTestId("expense-amount").fill("6000")
  await page.getByTestId("expense-payer").selectOption({ label: "Dave" })
  await setParticipants(page, ["Dave", "Bob"])
  await page.getByTestId("split-equal").click()
  await page.getByTestId("expense-submit").click()
  await expect(page.getByText("Rs. 6,000.00 paid by Dave")).toBeVisible()

  await expect(page.getByTestId("balance-sum")).toHaveText("Sum: Rs. 0.00")
  await expect(page.getByTestId("balance-Alice")).toContainText("Rs. 5,666.67")
  await expect(page.getByTestId("balance-Bob")).toContainText("-Rs. 9,333.33")
  await expect(page.getByTestId("balance-Carol")).toContainText("Rs. 7,000.00")
  await expect(page.getByTestId("balance-Dave")).toContainText("-Rs. 3,333.34")

  const rows = page.getByTestId("settle-row")
  await expect(rows).toHaveCount(3)
  await expect(page.getByTestId("settle-up")).not.toContainText("pairwise")
})

test("Rs. 100 equal among 3 people shows a zero balance sum", async ({ page }) => {
  for (const name of ["Ann", "Bea", "Cam"]) await addPerson(page, name)
  await page.getByTestId("expense-amount").fill("100")
  await page.getByTestId("expense-payer").selectOption({ label: "Ann" })
  await setParticipants(page, ["Ann", "Bea", "Cam"])
  await page.getByTestId("expense-submit").click()
  await expect(page.getByTestId("balance-sum")).toHaveText("Sum: Rs. 0.00")
})

test("exact amounts that do not sum are rejected and not saved", async ({ page }) => {
  await addPerson(page, "Ann")
  await addPerson(page, "Bea")
  await page.getByTestId("expense-amount").fill("100")
  await page.getByTestId("expense-payer").selectOption({ label: "Ann" })
  await page.getByTestId("participant-Ann").click()
  await page.getByTestId("participant-Bea").click()
  await page.getByTestId("split-exact").click()
  await page.getByTestId("exact-Ann").fill("40")
  await page.getByTestId("exact-Bea").fill("40")
  await page.getByTestId("expense-submit").click()
  await expect(page.getByTestId("form-error")).toContainText("sum")
  await expect(page.getByText("No expenses yet.")).toBeVisible()
})

test("edit and delete recalculate balances; reload restores the session", async ({
  page,
}) => {
  await addPerson(page, "Ann")
  await addPerson(page, "Bea")
  await page.getByTestId("expense-amount").fill("100")
  await page.getByTestId("expense-payer").selectOption({ label: "Ann" })
  await page.getByTestId("participant-Ann").click()
  await page.getByTestId("participant-Bea").click()
  await page.getByTestId("expense-submit").click()
  await expect(page.getByTestId("balance-Ann")).toContainText("Rs. 50.00")

  await page.getByRole("button", { name: "Edit" }).click()
  await page.getByTestId("expense-amount").fill("200")
  await page.getByTestId("expense-submit").click()
  await expect(page.getByTestId("balance-Ann")).toContainText("Rs. 100.00")
  await expect(page.getByTestId("balance-sum")).toHaveText("Sum: Rs. 0.00")

  await page.reload()
  await expect(page.getByTestId("person-Ann")).toBeVisible()
  await expect(page.getByTestId("balance-Ann")).toContainText("Rs. 100.00")

  await page.getByRole("button", { name: "Delete" }).click()
  await expect(page.getByText("No expenses yet.")).toBeVisible()
  await expect(page.getByTestId("balance-Ann")).toContainText("Rs. 0.00")
})
