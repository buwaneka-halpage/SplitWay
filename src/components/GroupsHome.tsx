"use client"

import { useEffect, useState, type FormEvent } from "react"
import Link from "next/link"
import { Plus } from "lucide-react"
import { loadGroups, removeGroup, saveGroups, type Group } from "@/lib"
import { newId } from "@/lib/form"
import { ThemeToggle } from "@/components/ThemeToggle"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function GroupsHome() {
  const [groups, setGroups] = useState<Group[]>([])
  const [name, setName] = useState("")

  useEffect(() => {
    setGroups(loadGroups())
  }, [])

  function addGroup(event: FormEvent) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    const group: Group = { id: newId(), name: trimmed, people: [], expenses: [] }
    const next = [...groups, group]
    saveGroups(next)
    setGroups(next)
    setName("")
  }

  function deleteGroup(id: string) {
    removeGroup(id)
    setGroups(loadGroups())
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 pb-8 pt-2 md:mx-auto md:w-full md:max-w-5xl md:px-8 md:py-10">
      <header className="flex items-start justify-between gap-3 pt-2 md:pt-0">
        <div>
          <p className="text-xs font-medium tracking-wide text-primary uppercase">LKR splitter</p>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">SplitWay</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="md:hidden">Groups stay on this phone. No login.</span>
            <span className="hidden md:inline">Groups stay in this browser. No login.</span>
          </p>
        </div>
        <ThemeToggle testId="theme-toggle" />
      </header>

      <form className="flex gap-2 md:max-w-md" onSubmit={addGroup}>
        <Input
          className="h-11 text-base md:h-9 md:text-sm"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Trip, house, dinner…"
          autoComplete="off"
          data-testid="group-name"
        />
        <Button className="h-11 px-4 md:h-9" type="submit" data-testid="group-add">
          <Plus />
          New
        </Button>
      </form>

      {groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">No groups yet. Name one to start.</p>
      ) : (
        <ul className="flex flex-col gap-3 md:grid md:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <li key={group.id}>
              <Card size="sm" className="h-full">
                <CardHeader className="flex-row items-start justify-between gap-2">
                  <Link
                    href={`/groups/${group.id}`}
                    className="min-w-0 flex-1"
                    data-testid={`group-${group.name}`}
                  >
                    <CardTitle>{group.name}</CardTitle>
                    <CardDescription>
                      {group.people.length} {group.people.length === 1 ? "person" : "people"}
                      {" · "}
                      {group.expenses.length}{" "}
                      {group.expenses.length === 1 ? "expense" : "expenses"}
                    </CardDescription>
                  </Link>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    data-testid={`group-delete-${group.name}`}
                    onClick={() => deleteGroup(group.id)}
                  >
                    Delete
                  </Button>
                </CardHeader>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
