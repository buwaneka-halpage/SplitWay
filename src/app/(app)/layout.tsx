export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh justify-center bg-muted">
      <div className="flex min-h-dvh w-full max-w-md flex-col bg-background pt-[env(safe-area-inset-top)] shadow-xl shadow-black/5">
        {children}
      </div>
    </div>
  )
}
