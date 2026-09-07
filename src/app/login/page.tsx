import { ForceDark } from "@/components/theme/force-dark"
import { LoginPageInner } from "./login-inner"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>
}) {
  const { error, message } = await searchParams
  return (
    <ForceDark>
      <LoginPageInner error={error} message={message} />
    </ForceDark>
  )
}
