import { ForceDark } from "@/components/theme/force-dark"
import { SignupPageInner } from "./signup-inner"

export default function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>
}) {
  return (
    <ForceDark>
      <SignupPageInner searchParams={searchParams} />
    </ForceDark>
  )
}
