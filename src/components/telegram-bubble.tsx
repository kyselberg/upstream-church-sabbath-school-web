import type { ReactNode } from "react"

export function TelegramBubble({
  caption = "Суботня школа · бот → група вчителів",
  children,
}: {
  caption?: string
  children: ReactNode
}) {
  return (
    <div className="rounded-xl rounded-tl-sm bg-muted p-3">
      <p className="text-[10px] font-medium text-muted-foreground">
        {caption}
      </p>
      <div className="mt-1">{children}</div>
    </div>
  )
}
