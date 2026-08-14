export const THEME_KEY = "splitway:theme"
export const THEME_LIGHT_COLOR = "#0f766e"
export const THEME_DARK_COLOR = "#171717"

/** Runs in <head> so the first paint matches localStorage / system preference. */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");var d=t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content",d?"${THEME_DARK_COLOR}":"${THEME_LIGHT_COLOR}")}catch(e){}})()`

export function applyTheme(theme: "light" | "dark"): void {
  document.documentElement.classList.toggle("dark", theme === "dark")
  localStorage.setItem(THEME_KEY, theme)
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute("content", theme === "dark" ? THEME_DARK_COLOR : THEME_LIGHT_COLOR)
}
