import { Title } from "@/lib/types"

// "Ch. 12 / 300" — or, for light novels with volume data, "Vol. 3 / 22 · Ch. 45"
export function TitleProgress({
  title,
}: {
  title: Pick<Title, "media_type" | "current_chapter" | "total_chapters" | "current_volume" | "total_volumes">
}) {
  const hasVol =
    title.media_type === "light_novel" &&
    ((title.total_volumes != null && title.total_volumes > 0) || (title.current_volume ?? 0) > 0)
  if (hasVol) {
    return (
      <>
        Vol. {title.current_volume ?? 0}
        <span className="text-muted-foreground">
          {title.total_volumes ? ` / ${title.total_volumes}` : ""}
          {title.current_chapter ? ` · Ch. ${title.current_chapter}` : ""}
        </span>
      </>
    )
  }
  return (
    <>
      Ch. {title.current_chapter}
      <span className="text-muted-foreground">
        {title.total_chapters ? ` / ${title.total_chapters}` : ""}
      </span>
    </>
  )
}
