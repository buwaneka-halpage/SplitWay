export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex h-dvh max-h-dvh flex-col overflow-hidden bg-background pt-[env(safe-area-inset-top)]">
      {children}
    </div>
  )
}
