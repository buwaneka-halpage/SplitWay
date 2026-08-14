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
  }

  return (
    <section className="flex flex-col gap-4 px-4 py-4">
      <h2 className="text-lg font-semibold">People</h2>
      <form className="flex gap-2" onSubmit={addPerson}>
        <div className="min-w-0 flex-1">
          <Label htmlFor="person-name" className="sr-only">
            Name
          </Label>
          <Input
            id="person-name"
            className="h-11 text-base"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="off"
            placeholder="Name"
            data-testid="person-name"
          />
        </div>
        <Button className="h-11 px-4" type="submit" data-testid="person-add">
          Add
        </Button>
      </form>
      {group.people.length === 0 ? (
        <p className="text-sm text-muted-foreground">No people yet.</p>
      ) : (
        <ul className="flex flex-col">
          {group.people.map((person) => {
            const referenced = isPersonReferenced(group, person.id)
            return (
              <li
                key={person.id}
                className="flex items-center justify-between gap-3 border-b py-3"
                data-testid={`person-${person.name}`}
              >
                <span className="font-medium">{person.name}</span>
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
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
