import type { ReactNode } from "react"

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-dvh max-h-dvh flex-col overflow-hidden bg-background pt-[env(safe-area-inset-top)]">
      {children}
    </div>
  )
}
