"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { createClient } from "@/lib/supabase/server"

export async function login(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    const msg =
      error.code === "email_not_confirmed"
        ? "Please confirm your email first — check your inbox."
        : error.code === "invalid_credentials"
          ? "Wrong email or password."
          : error.message
    redirect(`/login?error=${encodeURIComponent(msg)}`)
  }

  revalidatePath("/", "layout")
  redirect("/dashboard")
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const origin = (await headers()).get("origin") ?? "http://localhost:3000"

  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      data: { full_name: ((formData.get("full_name") as string) || "").trim() || null },
    },
  }

  const { error } = await supabase.auth.signUp(data)

  if (error) {
    let msg = error.message
    if (error.code === "over_email_send_rate_limit") {
      msg = "Too many signup attempts. Wait about an hour and try again."
    } else if (error.code === "user_already_exists") {
      msg = "This email is already registered. Try logging in instead."
    } else if (error.code === "weak_password") {
      msg = "Password too weak. Use at least 6 characters."
    }
    redirect(`/signup?error=${encodeURIComponent(msg)}`)
  }

  // Always require email confirmation before the account is usable.
  redirect("/login?message=Account created! Check your email to confirm, then log in.")
}

export async function signInWithGoogle() {
  const origin = (await headers()).get("origin") ?? "http://localhost:3000"
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback`,
      queryParams: { access_type: "offline", prompt: "consent" },
    },
  })
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`)
  if (data.url) redirect(data.url)
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/login")
}
