import { Suspense } from "react"
import { ExplorePageInner } from "./explore-inner"

export default function ExplorePage() {
  return (
    <Suspense>
      <ExplorePageInner />
    </Suspense>
  )
}
