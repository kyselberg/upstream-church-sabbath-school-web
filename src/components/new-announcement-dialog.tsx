import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useCreateAnnouncement, useSettings } from "@/lib/hooks"

export function NewAnnouncementDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [text, setText] = useState("")
  const settingsQuery = useSettings()
  const createAnnouncement = useCreateAnnouncement()
  const missingChat = !settingsQuery.data?.telegramGroupChatId

  function handleSend() {
    createAnnouncement.mutate(
      { text },
      {
        onSuccess: () => {
          setText("")
          onOpenChange(false)
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Нове оголошення</DialogTitle>
        </DialogHeader>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Тижневе нагадування бот шле сам — пт, 18:00"
        />
        {missingChat && (
          <p className="rounded-md bg-destructive/10 px-2 py-1.5 text-destructive">
            Спершу вкажи ID групового чату в Налаштуваннях
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Скасувати
          </Button>
          <Button
            disabled={!text.trim() || missingChat || createAnnouncement.isPending}
            onClick={handleSend}
          >
            Надіслати
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
