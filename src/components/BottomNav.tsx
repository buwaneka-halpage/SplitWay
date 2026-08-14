"use client"

import { Users, Receipt, Scale, ArrowLeftRight } from "lucide-react"
import { cn } from "@/lib/utils"

const items = [
  { id: "people", label: "People", icon: Users },
  { id: "expenses", label: "Expenses", icon: Receipt },
  { id: "balances", label: "Balances", icon: Scale },
  { id: "settle", label: "Settle", icon: ArrowLeftRight },
] as const

export function BottomNav() {
  function go(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  return (
    <nav
      className="bg-background/95 supports-backdrop-filter:bg-background/80 fixed inset-x-0 bottom-0 z-30 border-t backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid grid-cols-4">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => go(item.id)}
              className={cn(
                "text-muted-foreground flex min-h-11 w-full flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium",
              )}
            >
              <item.icon className="size-5" />
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
