import type { PersonId, Transfer } from "./types"

export function settle(nets: Record<PersonId, number>): Transfer[] {
  const remaining: Record<PersonId, number> = {}
  for (const [id, net] of Object.entries(nets)) {
    if (net !== 0) remaining[id] = net
  }

  const transfers: Transfer[] = []
  while (true) {
    const debtor = pick(remaining, "debtor")
    const creditor = pick(remaining, "creditor")
    if (debtor === null || creditor === null) break

    const amount = Math.min(-remaining[debtor]!, remaining[creditor]!)
    transfers.push({ from: debtor, to: creditor, amountCents: amount })
    remaining[debtor]! += amount
    remaining[creditor]! -= amount
    if (remaining[debtor] === 0) delete remaining[debtor]
    if (remaining[creditor] === 0) delete remaining[creditor]
  }
  return transfers
}

function pick(
  remaining: Record<PersonId, number>,
  role: "debtor" | "creditor",
): PersonId | null {
  let best: PersonId | null = null
  let bestAbs = 0
  for (const [id, net] of Object.entries(remaining)) {
    if (role === "debtor" ? net >= 0 : net <= 0) continue
    const abs = Math.abs(net)
    if (
      best === null ||
      abs > bestAbs ||
      (abs === bestAbs && id < best)
    ) {
      best = id
      bestAbs = abs
    }
  }
  return best
}
