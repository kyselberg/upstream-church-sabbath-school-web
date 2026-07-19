import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { MemberCombobox } from "@/components/member-combobox"
import { toastUndo } from "@/components/undo-toast"
import { useBulkAssign, useUndo, useSettings } from "@/lib/hooks"
import type { Member } from "@/lib/types"

export function BulkAssignDialog({
  slotIds,
  members,
  open,
  onOpenChange,
  onDone,
}: {
  slotIds: string[]
  members: Member[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onDone: () => void
}) {
  const bulkAssign = useBulkAssign()
  const undo = useUndo()
  const settingsQuery = useSettings()
  const [picked, setPicked] = useState<string | null>(null)

  useEffect(() => {
    if (open) setPicked(null)
  }, [open])

  function handleAssign() {
    if (!picked) return
    // ponytail: the chosen teacher must be in each selected slot's class
    // pool; server validates and returns a clear error toast on mismatch
    // rather than pre-filtering here.
    bulkAssign.mutate(
      {
        items: slotIds.map((id) => ({ assignmentId: id, memberId: picked })),
      },
      {
        onSuccess: (data) => {
          onDone()
          toastUndo({
            title: `Призначено ${data.count}`,
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
          <DialogTitle>Масове призначення</DialogTitle>
        </DialogHeader>
        <p className="text-muted-foreground">
          Обрано слотів: {slotIds.length}
        </p>
        <MemberCombobox members={members} value={picked} onChange={setPicked} />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Скасувати
          </Button>
          <Button
            disabled={!picked || bulkAssign.isPending}
            onClick={handleAssign}
          >
            Призначити
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
