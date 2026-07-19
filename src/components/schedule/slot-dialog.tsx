import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ConfirmDialog } from "@/components/confirm-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toastUndo } from "@/components/undo-toast"
import { AnnounceDialog } from "@/components/announce-dialog"
import { SwapDialog } from "@/components/schedule/swap-dialog"
import {
  useClassTeachers,
  useMembers,
  useReassign,
  useSubstitute,
  useMarkUnavailable,
  useCancelSlot,
  useAnnounce,
  useUndo,
} from "@/lib/hooks"
import type { Assignment, Settings } from "@/lib/types"

const STATUS_BADGE: Record<
  string,
  { label: string; variant: "secondary" | "destructive" | "outline" } | null
> = {
  planned: null,
  confirmed: { label: "підтверджено", variant: "secondary" },
  needs_substitute: { label: "потрібна заміна", variant: "destructive" },
  cancelled: { label: "скасовано", variant: "outline" },
}

function formatDate(date: string) {
  return `${date.slice(8, 10)}.${date.slice(5, 7)}`
}

function formatDateFull(date: string) {
  return `${date.slice(8, 10)}.${date.slice(5, 7)}.${date.slice(0, 4)}`
}

export function SlotDialog({
  assignment,
  assignments,
  open,
  onOpenChange,
  canAssign,
  canAnnounce,
  settings,
}: {
  assignment: Assignment
  assignments: Assignment[]
  open: boolean
  onOpenChange: (open: boolean) => void
  canAssign: boolean
  canAnnounce: boolean
  settings?: Settings
}) {
  const teachersQuery = useClassTeachers(assignment.classId)
  const membersQuery = useMembers(true)
  const reassign = useReassign()
  const substitute = useSubstitute()
  const markUnavailable = useMarkUnavailable()
  const cancelSlot = useCancelSlot()
  const announce = useAnnounce()
  const undo = useUndo()

  const [pickedId, setPickedId] = useState<string | null>(assignment.memberId)
  const [swapOpen, setSwapOpen] = useState(false)
  const [announceOpen, setAnnounceOpen] = useState(false)

  const pool = teachersQuery.data ?? []
  const poolIds = new Set(pool.map((p) => p.memberId))
  const rest = (membersQuery.data ?? []).filter((m) => !poolIds.has(m.id))
  const badge = STATUS_BADGE[assignment.status]
  const pending =
    reassign.isPending ||
    substitute.isPending ||
    markUnavailable.isPending ||
    cancelSlot.isPending

  function afterChange(title: string) {
    return (data: { changeId: string }) => {
      onOpenChange(false)
      toastUndo({
        title,
        description: `${assignment.className} · ${formatDate(assignment.date)}`,
        windowMinutes: settings?.undoWindowMinutes ?? 15,
        onUndo: () => undo.mutate({ ref: `change:${data.changeId}` }),
      })
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {formatDateFull(assignment.date)} · {assignment.className}
            </DialogTitle>
          </DialogHeader>

          <div className="flex items-center gap-2">
            <span>{assignment.memberName ?? "вільно"}</span>
            {badge && <Badge variant={badge.variant}>{badge.label}</Badge>}
          </div>

          <Select value={pickedId ?? undefined} onValueChange={setPickedId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Хто веде" />
            </SelectTrigger>
            <SelectContent>
              {pool.map((p) => (
                <SelectItem key={p.memberId} value={p.memberId}>
                  {p.fullName} · пул класу
                </SelectItem>
              ))}
              {rest.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex gap-2">
            <Button
              disabled={!pickedId || pending || !canAssign}
              onClick={() =>
                pickedId &&
                reassign.mutate(
                  { id: assignment.id, toMemberId: pickedId },
                  { onSuccess: afterChange("Перепризначено") }
                )
              }
            >
              Перепризначити
            </Button>
            <Button
              variant="outline"
              disabled={!pickedId || pending || !canAssign}
              onClick={() =>
                pickedId &&
                substitute.mutate(
                  { id: assignment.id, substituteMemberId: pickedId },
                  { onSuccess: afterChange("Заміну призначено") }
                )
              }
            >
              Як заміну
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={pending || !canAssign}
              onClick={() =>
                markUnavailable.mutate(
                  { id: assignment.id },
                  { onSuccess: afterChange("Позначено «не зможе»") }
                )
              }
            >
              Не зможе
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!canAssign}
              onClick={() => setSwapOpen(true)}
            >
              Обмін слотів
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!canAnnounce}
              onClick={() => setAnnounceOpen(true)}
            >
              Оголосити в Telegram
            </Button>
            <ConfirmDialog
              trigger={
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={!canAssign || cancelSlot.isPending}
                >
                  Скасувати слот
                </Button>
              }
              title="Скасувати слот?"
              description={`${assignment.className}, ${formatDate(assignment.date)}`}
              onConfirm={() =>
                cancelSlot.mutate(
                  { id: assignment.id },
                  { onSuccess: afterChange("Слот скасовано") }
                )
              }
              destructive
            />
          </div>
        </DialogContent>
      </Dialog>

      <SwapDialog
        assignment={assignment}
        assignments={assignments}
        open={swapOpen}
        onOpenChange={setSwapOpen}
      />

      <AnnounceDialog
        open={announceOpen}
        onOpenChange={setAnnounceOpen}
        assignment={assignment}
        settings={settings}
        pending={announce.isPending}
        onConfirm={() =>
          announce.mutate(
            { id: assignment.id },
            { onSuccess: () => setAnnounceOpen(false) }
          )
        }
      />
    </>
  )
}
