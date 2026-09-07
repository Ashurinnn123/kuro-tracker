import { ForceDark } from "@/components/theme/force-dark"
import { LoginPageInner } from "./login-inner"

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; message?: string }
}) {
  return (
    <ForceDark>
      <LoginPageInner searchParams={searchParams} />
    </ForceDark>
  )
}
