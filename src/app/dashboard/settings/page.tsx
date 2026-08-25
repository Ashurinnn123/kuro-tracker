"use client"

import { useTheme } from "next-themes"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/toast"
import { UserAvatar } from "@/components/ui/user-avatar"
import { createClient } from "@/lib/supabase/client"
import { useLibrary } from "@/components/library/library-provider"
import { Title } from "@/lib/types"
import { Save, Cloud, User, Camera, Sun, Moon, Monitor, Download, Upload } from "lucide-react"

export default function SettingsPage() {
  const { setTheme, theme, resolvedTheme } = useTheme()
  const { toast } = useToast()
  const { titles, addTitle } = useLibrary()
  
  // To avoid hydration mismatch with next-themes
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const [profile, setProfile] = useState<{ name: string; email: string; avatarUrl: string | null }>({ name: "", email: "", avatarUrl: null })
  const [username, setUsername] = useState("")
  const [isPublic, setIsPublic] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [signedIn, setSignedIn] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setSignedIn(true)
      setProfile(p => ({ ...p, email: user.email ?? "" }))
      const { data } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, username, is_library_public")
        .eq("id", user.id)
        .maybeSingle()
      setProfile(p => ({ ...p, name: data?.full_name ?? "", avatarUrl: data?.avatar_url ?? null }))
      setUsername(data?.username ?? "")
      setIsPublic(data?.is_library_public ?? false)
    })
  }, [])

  // Export library as JSON download; import merges titles that aren't
  // already present (matched by title + media_type).
  const handleExport = () => {
    if (titles.length === 0) {
      toast("Nothing to export — your library is empty.", "error")
      return
    }
    const payload = {
      app: "kuro-tracker",
      exported_at: new Date().toISOString(),
      titles,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `kuro-library-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast(`Exported ${titles.length} titles`)
  }

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    try {
      const parsed = JSON.parse(await file.text()) as { titles?: Partial<Title>[] }
      const incoming = Array.isArray(parsed.titles) ? parsed.titles : []
      if (incoming.length === 0) throw new Error("no titles")

      const existing = new Set(titles.map(t => `${t.title}|${t.media_type}`))
      let added = 0
      for (const t of incoming) {
        if (!t.title || !t.media_type) continue
        const key = `${t.title}|${t.media_type}`
        if (existing.has(key)) continue
        existing.add(key)
        await addTitle({
          title: t.title,
          media_type: t.media_type,
          cover_url: t.cover_url ?? null,
          total_chapters: t.total_chapters ?? null,
          current_chapter: t.current_chapter ?? 0,
          total_volumes: t.total_volumes ?? null,
          current_volume: t.current_volume ?? 0,
          status: t.status ?? "want_to_read",
          rating: t.rating ?? null,
          notes: t.notes ?? null,
          genres: t.genres ?? [],
          tags: t.tags ?? [],
          is_favorite: t.is_favorite ?? false,
          started_at: t.started_at ?? null,
          completed_at: t.completed_at ?? null,
        })
        added++
      }
      toast(`Imported ${added} new title(s), skipped ${incoming.length - added} duplicate(s).`)
    } catch {
      toast("Invalid export file — expected a Kuro JSON backup.", "error")
    }
  }

  const handleSaveProfile = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast("Not signed in — create a cloud account to save your profile.", "error")
      return
    }
    setSaving(true)
    // Username: lowercase slug; empty clears it. Unique violation surfaces a toast.
    const uname = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "")
    const { error } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        full_name: profile.name,
        username: uname || null,
        is_library_public: isPublic,
      })
    setSaving(false)
    if (error) {
      toast(
        error.code === "23505"
          ? "That username is taken — try another."
          : "Save failed: " + error.message,
        "error"
      )
      return
    }
    if (uname !== username.trim().toLowerCase()) setUsername(uname)
    toast("Profile updated")
    window.dispatchEvent(new Event("profile-updated"))
  }

  // Avatar upload: single object per user at avatars/<uid>/avatar.<ext> —
  // upsert overwrites the old photo, cache-bust via updated timestamp query.
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    if (!file.type.startsWith("image/")) {
      toast("Please pick an image file.", "error")
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast("Image too large. Max 2 MB.", "error")
      return
    }
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast("Sign in to upload a profile photo.", "error")
      return
    }
    setUploading(true)
    const ext = file.type === "image/png" ? "png" : "jpg"
    const path = `${user.id}/avatar.${ext}`
    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type })
    if (upErr) {
      setUploading(false)
      toast("Upload failed: " + upErr.message, "error")
      return
    }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path)
    const publicUrl = `${data.publicUrl}?v=${Date.now()}`
    const { error: dbErr } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", user.id)
    setUploading(false)
    if (dbErr) {
      toast("Save failed: " + dbErr.message, "error")
      return
    }
    setProfile(p => ({ ...p, avatarUrl: publicUrl }))
    window.dispatchEvent(new Event("profile-updated"))
    toast("Profile photo updated")
  }

  const handleAvatarRemove = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUploading(true)
    await supabase.storage.from("avatars").remove([`${user.id}/avatar.jpg`, `${user.id}/avatar.png`])
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: null })
      .eq("id", user.id)
    setUploading(false)
    if (error) {
      toast("Remove failed: " + error.message, "error")
      return
    }
    setProfile(p => ({ ...p, avatarUrl: null }))
    window.dispatchEvent(new Event("profile-updated"))
    toast("Profile photo removed")
  }

  const handleEnableSync = () => {
    // Cloud sync is now automatic: logged in → data goes to Supabase (RLS per user).
    toast("Cloud sync is already active for your account.")
  }
  if (!mounted) return null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account settings and preferences.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><User className="h-5 w-5" /> Profile</CardTitle>
          <CardDescription>Update your personal information.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Avatar: Notion-style initial circle as default, photo when uploaded */}
          <div className="flex items-center gap-4">
            <label className="relative cursor-pointer group" title={signedIn ? "Upload a photo" : "Sign in to upload"}>
              <UserAvatar name={profile.name} url={profile.avatarUrl} className="h-16 w-16 text-2xl" />
              {uploading ? (
                <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 text-xs text-white">...</span>
              ) : (
                <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 text-transparent transition-colors group-hover:bg-black/40 group-hover:text-white">
                  <Camera className="h-5 w-5" />
                </span>
              )}
              <input type="file" accept="image/png,image/jpeg" className="sr-only" onChange={handleAvatarChange} disabled={!signedIn || uploading} />
            </label>
            <div>
              <p className="text-sm font-medium">{profile.avatarUrl ? "Profile photo" : "Initial avatar"}</p>
              <p className="text-xs text-muted-foreground">PNG or JPG, max 2 MB.</p>
              {signedIn && profile.avatarUrl && (
                <Button variant="ghost" size="sm" className="mt-1 h-7 px-2 text-xs text-danger hover:bg-danger/10" onClick={handleAvatarRemove} disabled={uploading}>
                  Remove photo
                </Button>
              )}
            </div>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Display Name</label>
            <Input 
              value={profile.name} 
              onChange={e => setProfile({...profile, name: e.target.value})} 
              className="max-w-md"
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Email Address</label>
            <Input 
              type="email"
              value={profile.email} 
              disabled
              className="max-w-md"
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Username</label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">/u/</span>
              <Input
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="pick a handle"
                className="max-w-xs"
                maxLength={30}
              />
            </div>
            {username && (
              <p className="text-xs text-muted-foreground">
                Public shelf: kuro-tracker.vercel.app/u/{username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "") || "…"}
              </p>
            )}
          </div>
          <label className="flex max-w-md cursor-pointer items-center justify-between rounded-lg border border-border p-3">
            <span>
              <span className="block text-sm font-medium">Public library</span>
              <span className="block text-xs text-muted-foreground">
                Anyone with your link can see your shelf (covers + status only — never notes).
              </span>
            </span>
            <input
              type="checkbox"
              checked={isPublic}
              onChange={e => setIsPublic(e.target.checked)}
              className="h-5 w-5 accent-[var(--accent,#60a5fa)]"
            />
          </label>
        </CardContent>
        <CardFooter className="border-t border-border/50 px-6 py-4">
          <Button onClick={handleSaveProfile} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save Profile"}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Customize how the tracker looks on your device.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Stitch appearance picker: three panel buttons */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {([["light", "Light", Sun], ["dark", "Dark", Moon], ["system", "System", Monitor]] as const).map(
              ([value, label, Icon]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTheme(value)}
                  className={`flex flex-col items-center justify-center gap-2 rounded-xl p-6 transition-colors ${
                    theme === value
                      ? "border border-primary bg-surface-2 text-primary"
                      : "border border-border bg-background text-muted-foreground hover:bg-surface-2"
                  }`}
                >
                  <Icon className="h-6 w-6" />
                  <span className="font-mono text-xs uppercase tracking-widest">{label}</span>
                </button>
              )
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {resolvedTheme === "light"
              ? "System follows your OS — Windows is currently in light mode, so System and Light look identical."
              : "System follows your OS — Windows is currently in dark mode, so System and Dark look identical."}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Download className="h-5 w-5" /> Export / Import</CardTitle>
          <CardDescription>Back up your library as JSON, or restore from a Kuro export.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export library
          </Button>
          <label>
            <input type="file" accept="application/json,.json" className="sr-only" onChange={handleImportFile} />
            <span className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-border bg-transparent px-4 py-2 text-sm font-medium hover:bg-surface-2">
              <Upload className="h-4 w-4" />
              Import backup
            </span>
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Cloud className="h-5 w-5" /> Account &amp; Cloud Sync</CardTitle>
          <CardDescription>Your library syncs to the cloud automatically.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
          <span className="flex items-center gap-2 text-sm">
            <span className="relative flex h-3 w-3">
              {signedIn && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />}
              <span className={`relative inline-flex h-3 w-3 rounded-full ${signedIn ? "bg-primary" : "bg-muted-foreground"}`} />
            </span>
            {signedIn ? "Synced to cloud" : "Local only — not signed in"}
          </span>
          <Cloud className="ml-auto h-5 w-5 text-muted-foreground" />
        </CardContent>
      </Card>
    </div>
  )
}
