import { GroupShell } from "@/components/GroupShell"

export default async function GroupLayout({
  children,
  params,
}: LayoutProps<"/groups/[groupId]">) {
  const { groupId } = await params
  return <GroupShell groupId={groupId}>{children}</GroupShell>
}
