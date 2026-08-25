import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function progressPct(
  current: number,
  total: number | null,
  status?: string,
  volume?: { current: number | null; total: number | null }
): number {
  if (status === "completed") return 100
  // Light novels: volume is the primary progress signal
  if (volume && volume.total && volume.total > 0) {
    const volPct = ((volume.current ?? 0) / volume.total) * 100
    return Math.min(100, Math.max(0, Math.round(volPct)))
  }
  if (!total || total === 0) return 0
  return Math.min(100, Math.max(0, Math.round((current / total) * 100)))
}
