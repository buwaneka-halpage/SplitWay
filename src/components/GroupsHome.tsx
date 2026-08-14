"use client"

import { useEffect, useState, type FormEvent } from "react"
import Link from "next/link"
import { Plus } from "lucide-react"
import { loadGroups, removeGroup, saveGroups, type Group } from "@/lib"
import { newId } from "@/lib/form"
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
    <div className="flex flex-1 flex-col gap-5 px-4 pb-8 pt-2">
      <header className="pt-2">
        <p className="text-xs font-medium tracking-wide text-primary uppercase">LKR splitter</p>
        <h1 className="text-2xl font-semibold tracking-tight">SplitWay</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Groups stay on this phone. No login.
        </p>
      </header>

      <form className="flex gap-2" onSubmit={addGroup}>
        <Input
          className="h-11 text-base"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Trip, house, dinner…"
          autoComplete="off"
          data-testid="group-name"
        />
        <Button className="h-11 px-4" type="submit" data-testid="group-add">
          <Plus />
          New
        </Button>
      </form>

      {groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">No groups yet. Name one to start.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {groups.map((group) => (
            <li key={group.id}>
              <Card size="sm">
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
