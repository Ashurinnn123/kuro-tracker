import { Badge } from "@/components/ui/badge"
import { STATUS_META } from "@/lib/constants"
import { ReadingStatus } from "@/lib/types"
import { cn } from "@/lib/utils"

export function StatusBadge({ status, className }: { status: ReadingStatus, className?: string }) {
  const meta = STATUS_META[status]
  return (
    <Badge className={cn("border-0 text-[10px] uppercase tracking-wider font-bold", meta.colorClass, className)}>
      {meta.label}
    </Badge>
  )
}
