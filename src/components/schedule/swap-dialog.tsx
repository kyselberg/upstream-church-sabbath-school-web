import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toastUndo } from "@/components/undo-toast"
import { useSwap, useUndo, useSettings } from "@/lib/hooks"
import type { Assignment } from "@/lib/types"

function formatDate(date: string) {
  return `${date.slice(8, 10)}.${date.slice(5, 7)}`
}

export function SwapDialog({
  assignment,
  assignments,
  open,
  onOpenChange,
}: {
  assignment: Assignment
  assignments: Assignment[]
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const settingsQuery = useSettings()
  const swap = useSwap()
  const undo = useUndo()
  const [bId, setBId] = useState<string | null>(null)

  useEffect(() => {
    if (open) setBId(null)
  }, [open])

  const today = new Date().toISOString().slice(0, 10)
  const options = assignments.filter(
    (a) =>
      a.memberId &&
      a.id !== assignment.id &&
      a.memberId !== assignment.memberId &&
      a.date >= today &&
      a.status !== "cancelled"
  )

  function handleSwap() {
    if (!bId) return
    swap.mutate(
      { aId: assignment.id, bId },
      {
        onSuccess: (data) => {
          onOpenChange(false)
          toastUndo({
            title: "Слоти обміняно",
            windowMinutes: settingsQuery.data?.undoWindowMinutes ?? 15,
            onUndo: () => undo.mutate({ ref: `swap:${data.swapGroupId}` }),
          })
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Обмін слотів</DialogTitle>
        </DialogHeader>
        <p className="text-muted-foreground">
          {assignment.className} · {formatDate(assignment.date)} —{" "}
          {assignment.memberName}
        </p>
        <Select value={bId ?? undefined} onValueChange={setBId}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Оберіть слот" />
          </SelectTrigger>
          <SelectContent>
            {options.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.className} · {formatDate(a.date)} — {a.memberName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Скасувати
          </Button>
          <Button disabled={!bId || swap.isPending} onClick={handleSwap}>
            Обміняти
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
