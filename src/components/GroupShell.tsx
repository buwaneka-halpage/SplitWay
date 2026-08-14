"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ArrowLeftRight, ChevronLeft, Receipt, Scale, Users } from "lucide-react"
import { loadGroup, upsertGroup, type Group } from "@/lib"
import { ThemeToggle } from "@/components/ThemeToggle"
import { cn } from "@/lib/utils"

const GroupContext = createContext<{
  group: Group
  commit: (next: Group) => void
} | null>(null)

export function useGroup() {
  const ctx = useContext(GroupContext)
  if (!ctx) throw new Error("useGroup must be used under GroupShell")
  return ctx
}

const tabs = [
  { href: "people", label: "People", testId: "tab-people", icon: Users },
  { href: "", label: "Expenses", testId: "tab-expenses", icon: Receipt },
  { href: "balances", label: "Balances", testId: "tab-balances", icon: Scale },
  { href: "settle", label: "Settle", testId: "tab-settle", icon: ArrowLeftRight },
] as const

export function GroupShell({
  groupId,
  children,
}: {
  groupId: string
  children: ReactNode
}) {
  const [group, setGroup] = useState<Group | null | undefined>(undefined)
  const pathname = usePathname()
  const base = `/groups/${groupId}`

  useEffect(() => {
    setGroup(loadGroup(groupId))
  }, [groupId])

  function commit(next: Group) {
    upsertGroup(next)
    setGroup(next)
  }

  if (group === undefined) {
    return <p className="px-4 py-8 text-sm text-muted-foreground">Loading…</p>
  }
  if (group === null) {
    return (
      <div className="flex flex-1 flex-col items-start gap-3 px-4 py-8">
        <p className="text-sm">That group is not on this device.</p>
        <Link href="/" className="text-sm font-medium text-primary">
          Back to groups
        </Link>
      </div>
    )
  }

  return (
    <GroupContext.Provider value={{ group, commit }}>
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <nav className="order-last grid grid-cols-4 border-t bg-background pb-[env(safe-area-inset-bottom)] md:order-first md:flex md:w-60 md:shrink-0 md:flex-col md:gap-1 md:border-t-0 md:border-r md:p-3 md:pb-3">
          <div className="mb-2 hidden border-b px-2 pb-3 md:block">
            <Link
              href="/"
              className="text-xs font-medium tracking-wide text-primary uppercase"
            >
              SplitWay
            </Link>
            <p className="mt-1 truncate text-base font-semibold">{group.name}</p>
          </div>
          {tabs.map((tab) => {
            const href = tab.href ? `${base}/${tab.href}` : base
            const active = tab.href === "" ? pathname === base : pathname === href
            const Icon = tab.icon
            return (
              <Link
                key={tab.testId}
                href={href}
                data-testid={tab.testId}
                className={cn(
                  "flex min-h-11 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium touch-manipulation",
                  "md:min-h-10 md:flex-row md:justify-start md:gap-2 md:rounded-lg md:px-3 md:py-2 md:text-sm",
                  active
                    ? "text-primary md:bg-primary/10"
                    : "text-muted-foreground md:hover:bg-muted md:hover:text-foreground",
                )}
              >
                <Icon className="size-5 md:size-4" />
                {tab.label}
              </Link>
            )
          })}
        </nav>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="flex items-center gap-1 border-b bg-background/90 px-2 py-2 backdrop-blur md:hidden">
            <Link
              href="/"
              className="inline-flex size-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Back to groups"
            >
              <ChevronLeft className="size-5" />
            </Link>
            <h1 className="min-w-0 flex-1 truncate text-lg font-semibold tracking-tight">
              {group.name}
            </h1>
            <ThemeToggle />
          </header>
          <header className="hidden items-center justify-between border-b px-8 py-4 md:flex">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">{group.name}</h1>
              <p className="text-sm text-muted-foreground">
                {group.people.length} {group.people.length === 1 ? "person" : "people"}
                {" · "}
                {group.expenses.length}{" "}
                {group.expenses.length === 1 ? "expense" : "expenses"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/"
                aria-label="Back to groups"
                className="text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                All groups
              </Link>
              <ThemeToggle />
            </div>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        </div>
      </div>
    </GroupContext.Provider>
  )
}
