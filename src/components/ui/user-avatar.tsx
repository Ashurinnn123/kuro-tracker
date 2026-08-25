// Notion-style avatar: colored circle + first initial, or the user's uploaded
// photo. Background color is derived from the name so it stays consistent.
import { cn } from "@/lib/utils"

const PALETTE = [
  "#e07a5f", "#3b82f6", "#10b981", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f59e0b", "#64748b",
]

export function avatarColor(name: string | undefined | null): string {
  const n = (name ?? "").trim() || "U"
  let h = 0
  for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) >>> 0
  return PALETTE[h % PALETTE.length]
}

export function UserAvatar({
  name,
  url,
  className,
}: {
  name?: string | null
  url?: string | null
  className?: string
}) {
  const initial = ((name ?? "").trim() || "U").charAt(0).toUpperCase()
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name ?? "Avatar"}
        className={cn("rounded-full object-cover", className)}
      />
    )
  }
  return (
    <div
      className={cn("flex items-center justify-center rounded-full font-semibold text-white select-none", className)}
      style={{ backgroundColor: avatarColor(name) }}
      aria-hidden="true"
    >
      {initial}
    </div>
  )
}
