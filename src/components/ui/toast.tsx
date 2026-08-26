"use client"

import * as React from "react"
import { createContext, useContext, useState, useCallback } from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

type ToastType = "default" | "error"

interface Toast {
  id: string
  message: string
  type: ToastType
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((message: string, type: ToastType = "default") => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts((prev) => [...prev, { id, message, type }])

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3000)
  }, [])

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-0 right-0 z-50 flex flex-col gap-2 pointer-events-none p-4 w-full sm:max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto relative flex w-full items-start justify-between gap-3 overflow-hidden rounded-md border px-4 py-3 pr-8 shadow-lg transition-all animate-in slide-in-from-bottom-5",
              t.type === "error"
                ? "bg-danger text-danger-foreground border-danger"
                : "bg-surface text-foreground border-border"
            )}
          >
            <p className="text-sm font-semibold leading-snug break-words min-w-0">{t.message}</p>
            <button
              onClick={() => removeToast(t.id)}
              className="absolute right-2 top-2 rounded-md p-1 opacity-50 hover:opacity-100 transition-opacity shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  return context
}
