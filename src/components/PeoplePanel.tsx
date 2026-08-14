"use client"

import { useState, type FormEvent } from "react"
import { isPersonReferenced, newId } from "@/lib/form"
import { useGroup } from "@/components/GroupShell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function PeoplePanel() {
  const { group, commit } = useGroup()
  const [name, setName] = useState("")
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState("")

  function addPerson(event: FormEvent) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    commit({
      ...group,
      people: [...group.people, { id: newId(), name: trimmed }],
    })
    setName("")
  }

  function removePerson(personId: string) {
    if (isPersonReferenced(group, personId)) return
    commit({
      ...group,
      people: group.people.filter((person) => person.id !== personId),
    })
    if (renamingId === personId) {
      setRenamingId(null)
      setRenameValue("")
    }
  }

  function startRename(personId: string, currentName: string) {
    setRenamingId(personId)
    setRenameValue(currentName)
  }

  function saveRename(event: FormEvent, personId: string) {
    event.preventDefault()
    const trimmed = renameValue.trim()
    if (!trimmed) return
    commit({
      ...group,
      people: group.people.map((p) =>
        p.id === personId ? { ...p, name: trimmed } : p
      ),
    })
    setRenamingId(null)
    setRenameValue("")
  }

  function focusNameInput() {
    document.getElementById("person-name")?.focus()
  }

  return (
    <section className="flex flex-col gap-4 px-4 py-4 md:max-w-2xl md:px-8 md:py-6">
      <h2 className="text-lg font-semibold">People</h2>
      <form className="flex gap-2" onSubmit={addPerson}>
        <div className="min-w-0 flex-1">
          <Label htmlFor="person-name" className="sr-only">
            Name
          </Label>
          <Input
            id="person-name"
            className="h-11 text-base md:h-9 md:text-sm"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="off"
            placeholder="Name"
            data-testid="person-name"
          />
        </div>
        <Button className="h-11 px-4 md:h-9" type="submit" data-testid="person-add">
          Add
        </Button>
      </form>
      {group.people.length === 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">No people yet.</p>
          <Button
            className="h-11 w-fit px-4 md:h-9"
            type="button"
            variant="outline"
            data-testid="empty-add-person"
            onClick={focusNameInput}
          >
            Add a person
          </Button>
        </div>
      ) : (
        <ul className="flex flex-col">
          {group.people.map((person) => {
            const referenced = isPersonReferenced(group, person.id)
            const renaming = renamingId === person.id
            return (
              <li
                key={person.id}
                className="flex items-center justify-between gap-3 border-b py-3"
                data-testid={`person-${person.name}`}
              >
                {renaming ? (
                  <form
                    className="flex min-w-0 flex-1 gap-2"
                    onSubmit={(event) => saveRename(event, person.id)}
                  >
                    <Input
                      className="h-11 min-w-0 flex-1 text-base md:h-9 md:text-sm"
                      value={renameValue}
                      onChange={(event) => setRenameValue(event.target.value)}
                      autoComplete="off"
                      autoFocus
                      data-testid="person-rename-input"
                    />
                    <Button
                      className="h-11 px-4 md:h-9"
                      type="submit"
                      data-testid="person-rename-save"
                    >
                      Save
                    </Button>
                  </form>
                ) : (
                  <span className="font-medium">{person.name}</span>
                )}
                <div className="flex shrink-0 items-center gap-2">
                  {!renaming ? (
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      data-testid={`person-rename-${person.name}`}
                      onClick={() => startRename(person.id, person.name)}
                    >
                      Rename
                    </Button>
                  ) : null}
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    disabled={referenced}
                    data-testid={`person-remove-${person.name}`}
                    title={
                      referenced
                        ? "Remove is disabled while this person is on an expense"
                        : undefined
                    }
                    onClick={() => removePerson(person.id)}
                  >
                    Remove
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
