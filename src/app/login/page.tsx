import { ForceDark } from "@/components/theme/force-dark"
import { LoginPageInner } from "./login-inner"

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>
}) {
  return (
    <ForceDark>
      <LoginPageInner searchParams={searchParams} />
    </ForceDark>
  )
}
