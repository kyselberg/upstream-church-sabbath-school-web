import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { TelegramBubble } from "@/components/telegram-bubble"
import { useMembers } from "@/lib/hooks"
import type { Assignment, Settings } from "@/lib/types"

function formatDate(date: string) {
  return `${date.slice(8, 10)}.${date.slice(5, 7)}`
}

export function AnnounceDialog({
  open,
  onOpenChange,
  assignment,
  settings,
  onConfirm,
  pending,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  assignment: Assignment
  settings?: Settings
  onConfirm: () => void
  pending: boolean
}) {
  const membersQuery = useMembers(true)
  const missingChat = !settings?.telegramGroupChatId
  const origName = assignment.originalMemberId
    ? membersQuery.data?.find((m) => m.id === assignment.originalMemberId)
        ?.fullName
    : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Оголосити в Telegram</DialogTitle>
        </DialogHeader>
        <TelegramBubble>
          <p className="font-medium">
            {assignment.className} · {formatDate(assignment.date)}
          </p>
          <p className="text-muted-foreground">
            Веде: {assignment.memberName ?? "—"}
            {origName && ` замість ${origName}`}
          </p>
        </TelegramBubble>
        {missingChat && (
          <div className="rounded-md bg-destructive/10 p-2 text-destructive">
            Спершу вкажи ID групового чату в Налаштуваннях
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Скасувати
          </Button>
          <Button disabled={missingChat || pending} onClick={onConfirm}>
            Оголосити
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
