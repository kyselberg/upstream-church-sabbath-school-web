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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useActivity } from "@/lib/hooks"
import type { ActivityChange, ActivityItem } from "@/lib/types"
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
  pending: "Очікує",
  sent: "Надіслано",
  failed: "Помилка",
}

const ANNOUNCEMENT_STATUS_VARIANT: Record<
  string,
  "outline" | "default" | "destructive"
> = {
  pending: "outline",
  sent: "default",
  failed: "destructive",
}

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

function ChangeDetails({ item }: { item: ActivityChange }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span
        className={cn(item.undoneAt && "text-muted-foreground line-through")}
      >
        {item.className} — {item.date}
      </span>
      {(item.fromMemberName || item.toMemberName) && (
        <span className="text-muted-foreground">
          {item.fromMemberName ? `з ${item.fromMemberName} ` : ""}
          {item.toMemberName ? `на ${item.toMemberName}` : ""}
        </span>
      )}
      {item.actorMemberName && (
        <span className="text-muted-foreground">
          Автор: {item.actorMemberName}
        </span>
      )}
    </div>
  )
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const Icon = KIND_ICON[item.kind] ?? MegaphoneIcon

  return (
    <TableRow>
      <TableCell className="text-muted-foreground">
        {formatDateTime(item.createdAt)}
      </TableCell>
      <TableCell>
        <span className="flex items-center gap-2">
          <Icon className="size-3.5 text-muted-foreground" />
          {CHANGE_VERB[item.kind] ?? item.kind}
        </span>
      </TableCell>
      <TableCell>
        {isChange(item) ? (
          <ChangeDetails item={item} />
        ) : (
          <span className="text-muted-foreground">
            {item.targetDate ?? "—"}
          </span>
        )}
      </TableCell>
      <TableCell>
        {isChange(item) ? (
          <div className="flex flex-col items-start gap-1">
            <Badge variant="outline">
              {SOURCE_LABEL[item.source] ?? item.source}
            </Badge>
            {item.undoneAt && <Badge variant="destructive">скасовано</Badge>}
          </div>
        ) : (
          <Badge
            variant={ANNOUNCEMENT_STATUS_VARIANT[item.status] ?? "outline"}
          >
            {ANNOUNCEMENT_STATUS_LABEL[item.status] ?? item.status}
          </Badge>
        )}
      </TableCell>
    </TableRow>
  )
}

function ActivityPage() {
  const activity = useActivity({})

  return (
    <>
      <PageHeader title="Журнал активності" />
      <DataState
        query={activity}
        empty={<p className="text-sm text-muted-foreground">Немає даних</p>}
      >
        {(items) => (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Коли</TableHead>
                <TableHead>Подія</TableHead>
                <TableHead>Деталі</TableHead>
                <TableHead>Джерело/Статус</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <ActivityRow key={`${item.kind}-${item.id}`} item={item} />
              ))}
            </TableBody>
          </Table>
        )}
      </DataState>
    </>
  )
}
