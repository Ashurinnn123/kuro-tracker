"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BookOpen, LayoutDashboard, Settings } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Library", href: "/dashboard/library", icon: BookOpen },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="hidden shrink-0 border-r border-border/70 bg-sidebar text-sidebar-foreground lg:flex lg:w-64 lg:flex-col">
      <div className="flex items-center px-6 pb-6 pt-8">
        <Link href="/dashboard" className="flex flex-col gap-1.5">
          {/* eslint-disable-next-line @next/next/no-img-element -- static public asset */}
          <img src="/kuro-logo.jpg" alt="Kuro" className="h-14 w-14 rounded-xl" />
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            Reading Tracker
          </span>
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-1.5 overflow-y-auto px-4 pt-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-lg border-l-2 px-3 py-3 font-mono text-xs uppercase tracking-widest transition-colors",
                isActive
                  ? "border-l-primary bg-sidebar-active text-sidebar-foreground"
                  : "border-l-transparent text-muted-foreground hover:bg-sidebar-active/50 hover:text-sidebar-foreground"
              )}
            >
              <item.icon
                className={cn("h-4 w-4 shrink-0", isActive && "text-primary")}
                aria-hidden="true"
              />
              {item.name}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
