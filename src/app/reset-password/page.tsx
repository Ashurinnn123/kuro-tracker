import { Suspense } from "react"
import { ResetPasswordPageInner } from "./reset-password-inner"

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordPageInner />
    </Suspense>
  )
}
