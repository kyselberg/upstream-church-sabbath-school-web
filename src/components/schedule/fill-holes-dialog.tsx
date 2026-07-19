import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toastUndo } from "@/components/undo-toast"
import {
  useFillSuggestions,
  useBulkAssign,
  useMembers,
  useUndo,
  useSettings,
} from "@/lib/hooks"

const FREE = "__free__"

function formatDate(date: string) {
  return `${date.slice(8, 10)}.${date.slice(5, 7)}`
}

export function FillHolesDialog({
  quarterId,
  open,
  onOpenChange,
}: {
  quarterId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const sug = useFillSuggestions(quarterId, open)
  const membersQuery = useMembers(true)
  const bulkAssign = useBulkAssign()
  const undo = useUndo()
  const settingsQuery = useSettings()
  const [choices, setChoices] = useState<Record<string, string>>({})

  useEffect(() => {
    setChoices({})
  }, [quarterId])

  useEffect(() => {
    if (sug.data) {
      setChoices(
        Object.fromEntries(
          sug.data.holes.map((h) => [
            h.assignmentId,
            h.suggestedMemberId ?? FREE,
          ])
        )
      )
    }
  }, [sug.data])

  const holes = sug.data?.holes ?? []
  const allMembers = membersQuery.data ?? []
  const chosen = Object.entries(choices).filter(([, v]) => v !== FREE)
  const n = chosen.length

  function handleAssign() {
    bulkAssign.mutate(
      {
        items: chosen.map(([assignmentId, memberId]) => ({
          assignmentId,
          memberId,
        })),
      },
      {
        onSuccess: (data) => {
          onOpenChange(false)
          toastUndo({
            title: `Заповнено ${data.count}`,
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
          <DialogTitle>Заповнити дірки</DialogTitle>
        </DialogHeader>
        {sug.isLoading ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-7 w-full" />
            <Skeleton className="h-7 w-full" />
          </div>
        ) : holes.length === 0 ? (
          <p className="text-muted-foreground">Дірок немає</p>
        ) : (
          <div className="flex flex-col gap-2">
            {holes.map((h) => {
              const poolIds = new Set(h.options.map((o) => o.memberId))
              const rest = allMembers.filter((m) => !poolIds.has(m.id))
              return (
                <div key={h.assignmentId} className="flex items-center gap-2">
                  <span className="w-28 shrink-0">
                    {formatDate(h.date)} · {h.className}
                  </span>
                  <Select
                    value={choices[h.assignmentId] ?? FREE}
                    onValueChange={(v) =>
                      setChoices((c) => ({ ...c, [h.assignmentId]: v }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={FREE}>— лишити вільним</SelectItem>
                      {h.options.map((o) => (
                        <SelectItem key={o.memberId} value={o.memberId}>
                          {o.name} · {o.quarterLoad} субот
                        </SelectItem>
                      ))}
                      {rest.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.fullName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )
            })}
          </div>
        )}
        <DialogFooter>
          <Button
            disabled={sug.isLoading || !sug.data || n === 0 || bulkAssign.isPending}
            onClick={handleAssign}
          >
            Призначити {n}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
