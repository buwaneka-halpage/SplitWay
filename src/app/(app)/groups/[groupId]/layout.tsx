import type { ReactNode } from "react"
import { GroupShell } from "@/components/GroupShell"

export default async function GroupLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ groupId: string }>
}) {
  const { groupId } = await params
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <GroupShell groupId={groupId}>{children}</GroupShell>
    </div>
  )
}
