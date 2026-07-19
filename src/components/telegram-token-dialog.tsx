import { useEffect, useState } from "react"
import { Check } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useCreateTelegramToken } from "@/lib/hooks"
import type { Member } from "@/lib/types"

export function TelegramTokenDialog({
  member,
  open,
  onOpenChange,
}: {
  member: Member | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const createToken = useCreateTelegramToken()
  const [token, setToken] = useState<{
    deepLink: string
    expiresAt: string
  } | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setCopied(false)
    if (!open) {
      setToken(null)
      return
    }
    if (member && !member.telegramLinkedAt) {
      createToken.mutate(member.id, {
        onSuccess: (data) =>
          setToken({ deepLink: data.deepLink, expiresAt: data.expiresAt }),
      })
    }
  }, [open])

  async function copyLink() {
    if (!token) return
    try {
      await navigator.clipboard.writeText(token.deepLink)
      setCopied(true)
    } catch {
      toast.error("Не вдалося скопіювати")
    }
  }

  function regenerate() {
    if (!member) return
    createToken.mutate(member.id, {
      onSuccess: (data) =>
        setToken({ deepLink: data.deepLink, expiresAt: data.expiresAt }),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Токен онбордингу · {member?.fullName}</DialogTitle>
          <DialogDescription>
            Надішли вчителю посилання — він натисне Start у боті й зʼявиться
            тут як привʼязаний.
          </DialogDescription>
        </DialogHeader>

        {member?.telegramLinkedAt && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Check className="size-4 text-primary" />
              <span className="font-medium">Привʼязано</span>
              <Badge variant="secondary">привязано</Badge>
              {member.telegramUsername && (
                <span className="text-muted-foreground">
                  @{member.telegramUsername}
                </span>
              )}
            </div>
            {!token && (
              <p className="text-xs text-muted-foreground">
                Перепривʼязка відключить поточний Telegram.
              </p>
            )}
          </div>
        )}

        {token && (
          <div className="flex flex-col gap-2">
            <code className="block break-all rounded-md bg-muted p-2 text-xs">
              {token.deepLink}
            </code>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                діє до {new Date(token.expiresAt).toLocaleString("uk-UA")} ·
                одноразовий
              </p>
              <Button variant="outline" size="sm" onClick={copyLink}>
                {copied ? "Скопійовано" : "Копіювати"}
              </Button>
            </div>
          </div>
        )}

        {token && member && !member.telegramLinkedAt && (
          <div className="flex items-center gap-2">
            <span className="size-2 animate-pulse rounded-full bg-primary" />
            <span className="text-muted-foreground">
              Очікуємо Start у боті…
            </span>
          </div>
        )}

        <DialogFooter>
          {member?.telegramLinkedAt && (
            <div className="flex items-center gap-2 sm:mr-auto">
              <p className="text-xs text-muted-foreground">
                старий більше не діє
              </p>
              <Button
                variant="outline"
                onClick={regenerate}
                disabled={createToken.isPending}
              >
                Новий токен
              </Button>
            </div>
          )}
          <Button onClick={() => onOpenChange(false)}>Готово</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
