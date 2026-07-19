import { useEffect, useState } from "react"
import { toast } from "sonner"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"

function UndoToastCard({
  id,
  title,
  description,
  windowMinutes,
  onUndo,
}: {
  id: string | number
  title: string
  description?: string
  windowMinutes: number
  onUndo: () => void
}) {
  const [secondsLeft, setSecondsLeft] = useState(windowMinutes * 60)

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          toast.dismiss(id)
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [id])

  const mm = Math.floor(secondsLeft / 60)
  const ss = (secondsLeft % 60).toString().padStart(2, "0")

  return (
    <div className="flex items-start gap-2 rounded-lg bg-popover p-3 text-xs/relaxed text-popover-foreground shadow-md ring-1 ring-foreground/10">
      <div className="flex-1">
        <p className="font-medium">{title}</p>
        {description && (
          <p className="text-[11px] text-muted-foreground">{description}</p>
        )}
        <Button
          variant="outline"
          size="xs"
          className="mt-2"
          onClick={() => {
            onUndo()
            toast.dismiss(id)
          }}
        >
          Скасувати · {mm}:{ss}
        </Button>
      </div>
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label="Закрити"
        onClick={() => toast.dismiss(id)}
      >
        <X />
      </Button>
    </div>
  )
}

export function toastUndo({
  title,
  description,
  windowMinutes,
  onUndo,
}: {
  title: string
  description?: string
  windowMinutes: number
  onUndo: () => void
}) {
  // ponytail: the countdown window comes from settings.undoWindowMinutes; the
  // toast stays dismissible (X or timeout) rather than blocking the UI.
  toast.custom(
    (id) => (
      <UndoToastCard
        id={id}
        title={title}
        description={description}
        windowMinutes={windowMinutes}
        onUndo={onUndo}
      />
    ),
    { duration: Infinity }
  )
}
