import { useEffect, useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import {
  ArrowLeftRight,
  Ban,
  Bell,
  MegaphoneIcon,
  Repeat,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { DataState } from "@/components/data-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { NewAnnouncementDialog } from "@/components/new-announcement-dialog"
import { useActivity, useRetryAnnouncement, useSettings, useUndo } from "@/lib/hooks"
import { usePerms } from "@/lib/perms"
import type { ActivityAnnouncement, ActivityChange, ActivityItem } from "@/lib/types"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/_authed/activity")({
  component: ActivityPage,
})

const CHANGE_VERB: Record<string, string> = {
  assign: "Призначено",
  reassign: "Перепризначено",
  swap: "Обмін",
  substitute: "Заміна",
  unassign: "Знято призначення",
  cancel: "Скасовано",
  weekly_reminder: "Щотижневе нагадування",
  change: "Сповіщення про зміну",
  custom: "Довільне сповіщення",
}

const KIND_ICON: Record<string, typeof UserPlus> = {
  assign: UserPlus,
  reassign: Repeat,
  swap: ArrowLeftRight,
  substitute: Users,
  unassign: UserMinus,
  cancel: Ban,
  weekly_reminder: Bell,
  change: MegaphoneIcon,
  custom: MegaphoneIcon,
}

const SOURCE_LABEL: Record<string, string> = {
  web: "Веб",
  telegram: "Telegram",
  system: "Система",
}

const ANNOUNCEMENT_STATUS_LABEL: Record<string, string> = {
  pending: "в черзі",
  sent: "надіслано",
  failed: "помилка",
}

const ANNOUNCEMENT_STATUS_VARIANT: Record<
  string,
  "outline" | "secondary" | "destructive"
> = {
  pending: "outline",
  sent: "secondary",
  failed: "destructive",
}

type Tab = "all" | "changes" | "announcements"

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function isChange(item: ActivityItem): item is ActivityChange {
  return "assignmentId" in item
}

function UndoCountdownButton({
  deadlineMs,
  onUndo,
}: {
  deadlineMs: number
  onUndo: () => void
}) {
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, Math.round((deadlineMs - Date.now()) / 1000))
  )

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  if (secondsLeft <= 0) return null

  const mm = Math.floor(secondsLeft / 60)
  const ss = (secondsLeft % 60).toString().padStart(2, "0")

  return (
    <Button variant="outline" size="xs" onClick={onUndo}>
      Скасувати · {mm}:{ss}
    </Button>
  )
}

function ActivityRow({
  item,
  undoWindowMinutes,
  canUndo,
  canRetry,
  onUndo,
  onRetry,
}: {
  item: ActivityItem
  undoWindowMinutes: number
  canUndo: boolean
  canRetry: boolean
  onUndo: (ref: string) => void
  onRetry: (id: string) => void
}) {
  const Icon = KIND_ICON[item.kind] ?? MegaphoneIcon
  const change = isChange(item) ? item : null
  const announcement = item as ActivityAnnouncement

  return (
    <div className="flex min-h-11 items-center gap-3 px-3 py-2">
      <span className="w-[110px] shrink-0 text-[11px] text-muted-foreground">
        {formatDateTime(item.createdAt)}
      </span>
      <div className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <Icon className="size-3.5 shrink-0 text-muted-foreground" />
          <span
            className={cn(change?.undoneAt && "text-muted-foreground line-through")}
          >
            {CHANGE_VERB[item.kind] ?? item.kind}
          </span>
        </span>
        {change ? (
          <div
            className={cn(
              "mt-0.5 truncate text-muted-foreground",
              change.undoneAt && "line-through"
            )}
          >
            {change.className} — {change.date}
            {(change.fromMemberName || change.toMemberName) &&
              ` · ${change.fromMemberName ?? "вільно"} → ${change.toMemberName ?? "вільно"}`}
          </div>
        ) : (
          announcement.payload?.text && (
            <p className="mt-0.5 truncate text-muted-foreground">
              {announcement.payload.text}
            </p>
          )
        )}
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-2">
        {change ? (
          <>
            <Badge variant="outline">
              {SOURCE_LABEL[change.source] ?? change.source}
            </Badge>
            {change.undoneAt && <Badge variant="outline">скасовано</Badge>}
          </>
        ) : (
          <Badge
            variant={ANNOUNCEMENT_STATUS_VARIANT[announcement.status] ?? "outline"}
          >
            {ANNOUNCEMENT_STATUS_LABEL[announcement.status] ?? announcement.status}
          </Badge>
        )}
        {change && canUndo && !change.undoneAt && (
          <UndoCountdownButton
            deadlineMs={
              new Date(change.createdAt).getTime() + undoWindowMinutes * 60000
            }
            onUndo={() =>
              onUndo(
                change.swapGroupId
                  ? `swap:${change.swapGroupId}`
                  : `change:${change.id}`
              )
            }
          />
        )}
        {!change && announcement.status === "failed" && canRetry && (
          <Button variant="outline" size="xs" onClick={() => onRetry(item.id)}>
            Повторити
          </Button>
        )}
      </div>
    </div>
  )
}

function ActivityPage() {
  const [tab, setTab] = useState<Tab>("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const activity = useActivity({})
  const settingsQuery = useSettings()
  const undo = useUndo()
  const retryAnnouncement = useRetryAnnouncement()
  const { has } = usePerms()

  return (
    <>
      <PageHeader
        title="Журнал активності"
        action={
          <div className="flex items-center gap-2">
            <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
              <TabsList>
                <TabsTrigger value="all">Все</TabsTrigger>
                <TabsTrigger value="changes">Зміни</TabsTrigger>
                <TabsTrigger value="announcements">Оголошення</TabsTrigger>
              </TabsList>
            </Tabs>
            {has("announcement.send") && (
              <Button variant="outline" onClick={() => setDialogOpen(true)}>
                Нове оголошення
              </Button>
            )}
          </div>
        }
      />
      <DataState
        query={activity}
        empty={<p className="text-sm text-muted-foreground">Немає записів</p>}
      >
        {(items) => {
          const filtered = items.filter((item) =>
            tab === "all" ? true : tab === "changes" ? isChange(item) : !isChange(item)
          )
          if (filtered.length === 0) {
            return <p className="text-sm text-muted-foreground">Немає записів</p>
          }
          return (
            <Card className="gap-0 divide-y py-0">
              {filtered.map((item) => (
                <ActivityRow
                  key={`${item.kind}-${item.id}`}
                  item={item}
                  undoWindowMinutes={settingsQuery.data?.undoWindowMinutes ?? 30}
                  canUndo={has("schedule.assign")}
                  canRetry={has("announcement.send")}
                  onUndo={(ref) => undo.mutate({ ref })}
                  onRetry={(id) => retryAnnouncement.mutate(id)}
                />
              ))}
            </Card>
          )
        }}
      </DataState>
      <NewAnnouncementDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  )
}
