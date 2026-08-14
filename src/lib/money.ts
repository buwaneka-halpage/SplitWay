/** Parse rupees as decimal text so `"3333.33"` → `333333` without a binary float. */
export function toCents(input: string | number): number {
  const text = typeof input === "number" ? stringifyNumber(input) : input.trim()
  if (text === "" || text === "+" || text === "-") {
    throw new Error("Invalid amount")
  }
  const sign = text.startsWith("-") ? -1 : 1
  const body = text.startsWith("+") || text.startsWith("-") ? text.slice(1) : text
  if (!/^\d+(\.\d+)?$/.test(body)) {
    throw new Error("Invalid amount")
  }
  const [wholePart, fracPart = ""] = body.split(".")
  const whole = Number(wholePart)
  if (fracPart.length <= 2) {
    const frac = Number((fracPart + "00").slice(0, 2))
    return sign * (whole * 100 + frac)
  }
  let cents = whole * 100 + Number(fracPart.slice(0, 2))
  if (fracPart.charCodeAt(2) >= 53) cents += 1 // '5'
  return sign * cents
}

export function formatLkr(cents: number): string {
  const sign = cents < 0 ? "-" : ""
  const abs = Math.abs(cents)
  const rupees = Math.floor(abs / 100)
  const rem = abs % 100
  return `${sign}Rs. ${rupees.toLocaleString("en-US")}.${String(rem).padStart(2, "0")}`
}

function stringifyNumber(n: number): string {
  if (!Number.isFinite(n)) throw new Error("Invalid amount")
  if (Number.isInteger(n)) return String(n)
  return String(n)
}
