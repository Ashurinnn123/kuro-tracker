import type { ReactNode } from "react"

// Brand pages (landing + auth) are always dark regardless of app theme:
// a scoped class re-maps the CSS variables (next-themes nested providers
// are ignored, so this cannot be done with another ThemeProvider).
export function ForceDark({ children }: { children: ReactNode }) {
  return <div className="theme-dark contents">{children}</div>
}
