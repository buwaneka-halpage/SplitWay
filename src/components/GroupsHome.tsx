"use client"

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react"
import Link from "next/link"
import { Plus } from "lucide-react"
import {
  balances,
  deserializeGroups,
  formatLkr,
  loadGroups,
  removeGroup,
  saveGroups,
  serializeGroups,
  type Group,
} from "@/lib"
import { newId } from "@/lib/form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

function owedMostLine(group: Group): string | null {
  if (group.expenses.length === 0) return null
  const nets = balances(group)
  let bestId: string | null = null
  let bestNet = 0
  for (const [id, net] of Object.entries(nets)) {
    if (net <= 0) continue
    if (bestId === null || net > bestNet || (net === bestNet && id < bestId)) {
      bestId = id
      bestNet = net
    }
  }
  if (bestId === null) return "Settled"
  const person = group.people.find((p) => p.id === bestId)
  return `${person?.name ?? bestId} is owed ${formatLkr(bestNet)}`
}

export function GroupsHome() {
  const [groups, setGroups] = useState<Group[]>([])
  const [name, setName] = useState("")
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const [importError, setImportError] = useState<string | null>(null)

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
    if (renamingId === id) {
      setRenamingId(null)
      setRenameValue("")
    }
  }

  function startRename(group: Group) {
    setRenamingId(group.id)
    setRenameValue(group.name)
  }

  function saveRename(event: FormEvent, groupId: string) {
    event.preventDefault()
    const trimmed = renameValue.trim()
    if (!trimmed) return
    const next = groups.map((group) =>
      group.id === groupId ? { ...group, name: trimmed } : group,
    )
    saveGroups(next)
    setGroups(next)
    setRenamingId(null)
    setRenameValue("")
  }

  function exportGroups() {
    const blob = new Blob([serializeGroups(groups)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = "splitway-groups.json"
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  }

  async function importGroups(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    const next = deserializeGroups(await file.text())
    if (next === null) {
      setImportError("Could not import that file.")
      return
    }
    setImportError(null)
    saveGroups(next)
    setGroups(next)
    setRenamingId(null)
    setRenameValue("")
  }

  function focusNameInput() {
    document.getElementById("group-name")?.focus()
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 pb-8 pt-2 md:mx-auto md:w-full md:max-w-5xl md:px-8 md:py-10">
      <header className="flex flex-col gap-1 pt-2 md:flex-row md:items-end md:justify-between md:pt-0">
        <div>
          <p className="text-xs font-medium tracking-wide text-primary uppercase">LKR splitter</p>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">SplitWay</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="md:hidden">Groups stay on this phone. No login.</span>
            <span className="hidden md:inline">Groups stay in this browser. No login.</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-3 md:pt-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            data-testid="groups-export"
            onClick={exportGroups}
          >
            Export
          </Button>
          <input
            type="file"
            accept=".json,application/json"
            data-testid="groups-import"
            className="max-w-full text-sm text-muted-foreground file:mr-2 file:rounded-lg file:border file:border-border file:bg-background file:px-2.5 file:py-1 file:text-sm file:font-medium file:text-foreground"
            onChange={importGroups}
          />
        </div>
      </header>

      {importError ? (
        <p className="text-sm text-destructive" data-testid="import-error">
          {importError}
        </p>
      ) : null}

      <form className="flex gap-2 md:max-w-md" onSubmit={addGroup}>
        <Input
          id="group-name"
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
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">No groups yet. Name one to start.</p>
          <Button
            className="h-11 w-fit px-4 md:h-9"
            type="button"
            variant="outline"
            data-testid="empty-add-group"
            onClick={focusNameInput}
          >
            Add a group
          </Button>
        </div>
      ) : (
        <ul className="flex flex-col gap-3 md:grid md:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => {
            const renaming = renamingId === group.id
            const owed = owedMostLine(group)
            return (
              <li key={group.id}>
                <Card size="sm" className="h-full">
                  <CardHeader className="gap-2">
                    <div className="flex items-start justify-between gap-2">
                      {renaming ? (
                        <form
                          className="flex min-w-0 flex-1 gap-2"
                          onSubmit={(event) => saveRename(event, group.id)}
                        >
                          <Input
                            className="h-11 min-w-0 flex-1 text-base md:h-9 md:text-sm"
                            value={renameValue}
                            onChange={(event) => setRenameValue(event.target.value)}
                            autoComplete="off"
                            autoFocus
                            data-testid="group-rename-input"
                          />
                          <Button
                            className="h-11 px-4 md:h-9"
                            type="submit"
                            data-testid="group-rename-save"
                          >
                            Save
                          </Button>
                        </form>
                      ) : (
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
                      )}
                      <div className="flex shrink-0 items-center gap-1">
                        {!renaming ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            data-testid={`group-rename-${group.name}`}
                            onClick={() => startRename(group)}
                          >
                            Rename
                          </Button>
                        ) : null}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              data-testid={`group-delete-${group.name}`}
                            >
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete this group?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                variant="destructive"
                                data-testid="group-delete-confirm"
                                onClick={() => deleteGroup(group.id)}
                              >
                                Delete group
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                    {owed ? (
                      <p
                        className="text-sm text-muted-foreground"
                        data-testid={`group-owed-${group.name}`}
                      >
                        {owed}
                      </p>
                    ) : null}
                  </CardHeader>
                </Card>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
