import { Suspense } from "react"
import { ForgotPasswordPageInner } from "./forgot-password-inner"

export default function ForgotPasswordPage() {
  return (
    <Suspense>
      <ForgotPasswordPageInner />
    </Suspense>
  )
}
