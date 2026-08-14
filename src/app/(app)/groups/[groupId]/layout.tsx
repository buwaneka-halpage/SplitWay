import { GroupShell } from "@/components/GroupShell"

export default async function GroupLayout({
  children,
  params,
}: LayoutProps<"/groups/[groupId]">) {
  const { groupId } = await params
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <GroupShell groupId={groupId}>{children}</GroupShell>
    </div>
  )
}
