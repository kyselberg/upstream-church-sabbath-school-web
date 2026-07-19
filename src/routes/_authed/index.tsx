import { useEffect, useState } from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { TelegramTokenDialog } from "@/components/telegram-token-dialog"
import { FillHolesDialog } from "@/components/schedule/fill-holes-dialog"
import { usePerms } from "@/lib/perms"
import {
  useActivity,
  useAssignments,
  useClasses,
  useMembers,
  useQuarters,
} from "@/lib/hooks"
import type {
  ActivityChange,
  ActivityItem,
  Assignment,
  Class,
} from "@/lib/types"

export const Route = createFileRoute("/_authed/")({ component: DashboardPage })

const VERB: Record<string, string> = {
  assign: "Призначено",
  reassign: "Перепризначено",
  swap: "Обмін",
  substitute: "Заміна",
  unassign: "Знято",
  cancel: "Скасовано",
  weekly_reminder: "Нагадування",
  change: "Сповіщення",
  custom: "Оголошення",
}

function formatDate(dateISO: string) {
  const [y, m, d] = dateISO.split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString("uk-UA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function shortDate(dateISO: string) {
  return `${dateISO.slice(8, 10)}.${dateISO.slice(5, 7)}`
}

function isChange(item: ActivityItem): item is ActivityChange {
  return "assignmentId" in item
}

function DashboardPage() {
  const { has } = usePerms()
  const today = new Date().toISOString().slice(0, 10)

  const quartersQuery = useQuarters()
  const quarters = quartersQuery.data ?? []
  const quarter = quarters.find((q) => q.isActive) ?? quarters.at(0)

  const assignmentsQuery = useAssignments(
    quarter ? { from: quarter.startDate, to: quarter.endDate } : {}
  )
  const classesQuery = useClasses()
  const activityQuery = useActivity({})

  const [pollToken, setPollToken] = useState(false)
  const membersQuery = useMembers(true, pollToken ? 3000 : undefined)
  const members = membersQuery.data ?? []
  const unlinkedMembers = members.filter((m) => m.telegramUserId === null)

  const [tokenMemberId, setTokenMemberId] = useState<string | null>(null)
  const tokenMember = members.find((m) => m.id === tokenMemberId) ?? null

  useEffect(() => {
    if (tokenMember?.telegramLinkedAt) setPollToken(false)
  }, [tokenMember?.telegramLinkedAt])

  const [fillOpen, setFillOpen] = useState(false)

  return (
    <>
      <PageHeader title="Панель" />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))",
          gap: "1rem",
        }}
      >
        <NearestSaturdayCard
          today={today}
          assignments={assignmentsQuery.data}
          classes={classesQuery.data}
          isLoading={quartersQuery.isLoading || assignmentsQuery.isLoading || classesQuery.isLoading}
          error={quartersQuery.error ?? assignmentsQuery.error ?? classesQuery.error}
        />

        <GapsCard
          today={today}
          assignments={assignmentsQuery.data}
          isLoading={quartersQuery.isLoading || assignmentsQuery.isLoading}
          error={quartersQuery.error ?? assignmentsQuery.error}
          canFill={has("schedule.assign") && !!quarter}
          onFill={() => setFillOpen(true)}
        />

        <Card>
          <CardHeader>
            <CardTitle>Не привязані до Telegram ({unlinkedMembers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {membersQuery.isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : membersQuery.error ? (
              <p className="text-sm text-destructive">Помилка: {membersQuery.error.message}</p>
            ) : unlinkedMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground">Усі привʼязані</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {unlinkedMembers.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-2">
                    <span className="text-foreground">{m.fullName}</span>
                    {has("telegram.link") && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setTokenMemberId(m.id)
                          setPollToken(true)
                        }}
                      >
                        Токен
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle>Остання активність</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/activity">Журнал</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {activityQuery.isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : activityQuery.error ? (
              <p className="text-sm text-destructive">Помилка: {activityQuery.error.message}</p>
            ) : (activityQuery.data?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">Порожньо</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {activityQuery.data!.slice(0, 4).map((item) => {
                  const change = isChange(item) ? item : null
                  return (
                    <li key={`${item.kind}-${item.id}`} className="flex flex-col gap-0.5">
                      <span className={change?.undoneAt ? "text-muted-foreground line-through" : "text-foreground"}>
                        {change
                          ? `${VERB[item.kind] ?? item.kind} · ${change.className} — ${shortDate(change.date)}`
                          : VERB[item.kind] ?? item.kind}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(item.createdAt).toLocaleString("uk-UA", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <TelegramTokenDialog
        member={tokenMember}
        open={!!tokenMemberId}
        onOpenChange={(o) => {
          if (!o) {
            setTokenMemberId(null)
            setPollToken(false)
          }
        }}
      />
      {quarter && (
        <FillHolesDialog quarterId={quarter.id} open={fillOpen} onOpenChange={setFillOpen} />
      )}
    </>
  )
}

function NearestSaturdayCard({
  today,
  assignments,
  classes,
  isLoading,
  error,
}: {
  today: string
  assignments: Assignment[] | undefined
  classes: Class[] | undefined
  isLoading: boolean
  error: Error | null | undefined
}) {
  const nearestDate = (assignments ?? [])
    .map((a) => a.date)
    .filter((d) => d >= today)
    .sort()
    .at(0)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle>
          {nearestDate ? `Найближча субота ${formatDate(nearestDate)}` : "Найближча субота"}
        </CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/schedule">Розклад</Link>
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : error ? (
          <p className="text-sm text-destructive">Помилка: {error.message}</p>
        ) : !nearestDate ? (
          <p className="text-sm text-muted-foreground">Немає субот</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {[...(classes ?? [])]
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((cls) => {
                const a = assignments?.find((x) => x.classId === cls.id && x.date === nearestDate)
                return (
                  <li key={cls.id} className="flex items-center justify-between gap-2">
                    <span className="text-foreground">{cls.name}</span>
                    {a?.status === "needs_substitute" ? (
                      <Badge variant="destructive">потрібна заміна</Badge>
                    ) : !a?.memberId ? (
                      <span className="text-muted-foreground">вільно</span>
                    ) : (
                      <span className="text-foreground">{a.memberName}</span>
                    )}
                  </li>
                )
              })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function GapsCard({
  today,
  assignments,
  isLoading,
  error,
  canFill,
  onFill,
}: {
  today: string
  assignments: Assignment[] | undefined
  isLoading: boolean
  error: Error | null | undefined
  canFill: boolean
  onFill: () => void
}) {
  const gaps = (assignments ?? [])
    .filter((a) => !a.memberId && a.status !== "cancelled" && a.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle>Дірки в розкладі</CardTitle>
        {canFill && gaps.length > 0 && (
          <Button variant="outline" size="sm" onClick={onFill}>
            Заповнити
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : error ? (
          <p className="text-sm text-destructive">Помилка: {error.message}</p>
        ) : gaps.length === 0 ? (
          <p className="text-sm text-muted-foreground">Дірок немає</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {gaps.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-2">
                <span className="text-foreground">{a.className}</span>
                <span className="text-[11px] text-muted-foreground">{shortDate(a.date)}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
