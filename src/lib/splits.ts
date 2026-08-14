import type { PersonId } from "./types"

const FNV_OFFSET = 0x811c9dc5
const FNV_PRIME = 0x01000193

/** FNV-1a 32-bit over UTF-8 bytes. */
function fnv1a32(s: string): number {
  let hash = FNV_OFFSET
  const bytes = new TextEncoder().encode(s)
  for (const b of bytes) {
    hash ^= b
    hash = Math.imul(hash, FNV_PRIME)
  }
  return hash >>> 0
}

export function equalShares(
  totalCents: number,
  participantIds: PersonId[],
  expenseId?: string,
): Record<PersonId, number> {
  if (!Number.isInteger(totalCents) || totalCents < 0) {
    throw new Error("Expense total must be a non-negative integer cent amount")
  }
  const ids = [...new Set(participantIds)].sort()
  const n = ids.length
  if (n === 0) throw new Error("An expense needs at least one participant")

  const sumW = n
  const floors = ids.map(() => Math.floor(totalCents / sumW))
  const remainders = ids.map((_, i) => totalCents - floors[i]! * sumW)
  let leftover = totalCents - floors.reduce((a, b) => a + b, 0)
  const offset = expenseId === undefined ? 0 : fnv1a32(expenseId) % n

  while (leftover > 0) {
    let best = 0
    let bestRem = remainders[0]!
    let bestRot = (0 - offset + n) % n
    for (let i = 1; i < n; i++) {
      const rem = remainders[i]!
      const rot = (i - offset + n) % n
      if (rem > bestRem || (rem === bestRem && rot < bestRot)) {
        best = i
        bestRem = rem
        bestRot = rot
      }
    }
    floors[best]! += 1
    remainders[best]! -= sumW
    leftover -= 1
  }

  const shares: Record<PersonId, number> = {}
  for (let i = 0; i < n; i++) shares[ids[i]!] = floors[i]!
  return shares
}

export function exactShares(
  totalCents: number,
  exactCents: Record<PersonId, number>,
): Record<PersonId, number> {
  if (!Number.isInteger(totalCents) || totalCents < 0) {
    throw new Error("Expense total must be a non-negative integer cent amount")
  }
  let sum = 0
  for (const value of Object.values(exactCents)) {
    if (!Number.isInteger(value)) {
      throw new Error("Exact amounts must be integer cents")
    }
    sum += value
  }
  if (sum !== totalCents) {
    throw new Error("Exact amounts must sum to the expense total")
  }
  return { ...exactCents }
}
