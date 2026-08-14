"use client"

import { Moon, Sun } from "lucide-react"
import { applyTheme } from "@/lib/theme"
import { Button } from "@/components/ui/button"

export function ThemeToggle({ testId }: { testId?: string }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-10 shrink-0 md:size-8"
      data-testid={testId}
      aria-label="Toggle color theme"
      onClick={() =>
        applyTheme(document.documentElement.classList.contains("dark") ? "light" : "dark")
      }
    >
      <Moon className="dark:hidden" />
      <Sun className="hidden dark:block" />
    </Button>
  )
}
