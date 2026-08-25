import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Menu, Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme/theme-toggle"
import { createClient } from "@/lib/supabase/client"
import { useLibrary } from "@/components/library/library-provider"
import { UserAvatar } from "@/components/ui/user-avatar"

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const [showProfile, setShowProfile] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [user, setUser] = useState<{ name: string; email: string; avatarUrl: string | null } | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const { titles } = useLibrary()
  const router = useRouter()

  const loadUser = () => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user: u } }) => {
      if (!u) return
      const { data } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", u.id)
        .maybeSingle()
      setUser({
        name: data?.full_name || u.email?.split("@")[0] || "User",
        email: u.email ?? "",
        avatarUrl: data?.avatar_url ?? null,
      })
    })
  }

  useEffect(() => {
    loadUser()
    window.addEventListener("profile-updated", loadUser)
    return () => window.removeEventListener("profile-updated", loadUser)
  }, [])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
  }

  // Real notifications derived from the user's own library
  const notifications = useMemo(() => {
    const items: { id: string; title: string; body: string; unread: boolean; href: string }[] = []

    titles
      .filter((t) => t.status === "reading")
      .forEach((t) => {
        const remaining =
          t.total_chapters != null ? t.total_chapters - t.current_chapter : null
        items.push({
          id: `progress-${t.id}`,
          title: `Continue: ${t.title}`,
          body:
            remaining != null && remaining > 0
              ? `You're on chapter ${t.current_chapter} of ${t.total_chapters} — ${remaining} to go.`
              : `You're on chapter ${t.current_chapter}${t.total_chapters ? ` of ${t.total_chapters}` : ""}.`,
          unread: true,
          href: `/dashboard/library/titles/${t.id}`,
        })
      })

    titles
      .filter((t) => t.is_favorite && t.status !== "completed")
      .slice(0, 2)
      .forEach((t) => {
        items.push({
          id: `fav-${t.id}`,
          title: `Favorite on hold: ${t.title}`,
          body: "One of your favorites isn't finished yet — pick it back up?",
          unread: true,
          href: `/dashboard/library/titles/${t.id}`,
        })
      })

    if (titles.length === 0) {
      items.push({
        id: "empty-library",
        title: "Welcome to Kuro",
        body: "Your library is empty — add your first manga or manhwa to start tracking.",
        unread: true,
        href: "/dashboard/library",
      })
    }

    return items.slice(0, 6)
  }, [titles])

  const unreadCount = dismissed ? 0 : notifications.length

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-border bg-background px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
      <Button
        variant="ghost"
        size="icon"
        className="-m-2.5 p-2.5 text-foreground lg:hidden"
        onClick={onMenuClick}
      >
        <span className="sr-only">Open sidebar</span>
        <Menu className="h-6 w-6" aria-hidden="true" />
      </Button>

      {/* Separator */}
      <div className="h-6 w-px bg-border lg:hidden" aria-hidden="true" />

      <div className="flex flex-1 items-center gap-x-4 self-stretch lg:gap-x-6">
        <div className="flex items-center">
          <h1 className="text-lg font-semibold tracking-tight">Dashboard</h1>
        </div>
        <div className="flex flex-1 items-center justify-end gap-x-4 lg:gap-x-6 relative">
          
          {/* Notifications Dropdown */}
          <div className="relative">
            <Button 
              variant="ghost" 
              size="icon" 
              className="-m-2.5 p-2.5 text-muted-foreground hover:text-foreground"
              onClick={() => {
                setShowProfile(false)
                setShowNotifications(!showNotifications)
              }}
            >
              <span className="sr-only">View notifications</span>
              <Bell className="h-6 w-6" aria-hidden="true" />
              {/* Notification badge dot — only when there are unread items */}
              {unreadCount > 0 && (
                <span className="absolute top-1 right-2 h-2 w-2 rounded-full bg-primary" />
              )}
            </Button>
            
            {showNotifications && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-lg border border-border bg-surface p-4 shadow-lg ring-1 ring-black/5 animate-in fade-in zoom-in-95">
                  <h3 className="font-semibold text-sm mb-3">Notifications</h3>
                  {notifications.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-4 text-center">
                      Nothing new. You're all caught up.
                    </p>
                  ) : (
                    <div className="space-y-3 max-h-[320px] overflow-y-auto">
                      {notifications.map((n) => (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => {
                            setShowNotifications(false)
                            setDismissed(true)
                            router.push(n.href)
                          }}
                          className="flex gap-3 text-sm w-full text-left hover:bg-muted/50 rounded-md p-1 -m-1 transition-colors"
                        >
                          <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${n.unread && !dismissed ? "bg-primary" : "bg-transparent border border-border"}`} />
                          <div>
                            <p className="font-medium text-foreground text-xs">{n.title}</p>
                            <p className="text-muted-foreground text-xs mt-0.5">{n.body}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {notifications.length > 0 && (
                    <Button
                      variant="outline"
                      className="w-full mt-4 text-xs h-8"
                      onClick={() => setDismissed(true)}
                    >
                      Mark all as read
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Separator */}
          <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-border" aria-hidden="true" />

          {/* Profile Dropdown */}
          <div className="flex items-center gap-x-4">
            <ThemeToggle />
            
            <div className="relative">
              <button 
                className="flex items-center gap-x-2 focus:outline-none"
                onClick={() => {
                  setShowNotifications(false)
                  setShowProfile(!showProfile)
                }}
              >
                <UserAvatar name={user?.name} url={user?.avatarUrl} className="h-8 w-8 text-sm transition-transform hover:scale-105" />
                <span className="hidden lg:flex lg:items-center">
                  <span className="text-sm font-semibold leading-6 text-foreground" aria-hidden="true">
                    {user?.name ?? "Guest"}
                  </span>
                </span>
              </button>

              {showProfile && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowProfile(false)} />
                  <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-lg border border-border bg-surface py-2 shadow-lg ring-1 ring-black/5 animate-in fade-in zoom-in-95">
                    <div className="px-4 py-2 border-b border-border/50 mb-1">
                      <p className="text-sm font-medium">{user?.name ?? "Guest"}</p>
                      <p className="text-xs text-muted-foreground truncate">{user?.email ?? "Not signed in"}</p>
                    </div>
                    <a href="/dashboard/settings" className="block px-4 py-2 text-sm hover:bg-muted transition-colors">
                      Account Settings
                    </a>
                    <a href="/dashboard/library" className="block px-4 py-2 text-sm hover:bg-muted transition-colors">
                      My Library
                    </a>
                    <div className="border-t border-border/50 mt-1 pt-1">
                      <button onClick={handleSignOut} className="block w-full text-left px-4 py-2 text-sm text-danger hover:bg-danger/10 transition-colors">
                        Sign out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
