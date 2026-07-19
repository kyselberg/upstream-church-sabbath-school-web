import { useState } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { PageHeader } from "@/components/page-header"
import { DataState } from "@/components/data-state"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  useMe,
  useAssignments,
  useQuarters,
  useClasses,
  useClassTeachers,
  useMarkUnavailable,
  useRevert,
  useClaim,
} from "@/lib/hooks"
import { signOut } from "@/lib/auth-client"
import type { Assignment, Member } from "@/lib/types"

export const Route = createFileRoute("/_authed/my")({ component: MyPage })

const STATUS_BADGE: Partial<
  Record<Assignment["status"], { label: string; variant: "secondary" | "destructive" }>
> = {
  confirmed: { label: "підтверджено", variant: "secondary" },
  needs_substitute: { label: "шукаємо заміну", variant: "destructive" },
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function formatShort(dateISO: string) {
  const [, m, d] = dateISO.split("-")
  return `${d}.${m}`
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

function nameFor(assignments: Assignment[], memberId: string | null) {
  if (!memberId) return null
  return assignments.find((a) => a.memberId === memberId)?.memberName ?? null
}

function MyPage() {
  const meQuery = useMe()

  return (
    <div className="mx-auto max-w-md">
      <PageHeader title="Мій кабінет" />
      <DataState query={meQuery}>
        {(me) =>
          !me.member ? (
            <p className="text-sm text-muted-foreground">
              Ваш обліковий запис не привязаний до вчителя. Зверніться до
              адміністратора.
            </p>
          ) : (
            <TeacherPortal member={me.member} />
          )
        }
      </DataState>
    </div>
  )
}

function TeacherPortal({ member }: { member: Member }) {
  const [tab, setTab] = useState("my")
  const quartersQuery = useQuarters()
  const activeQuarter = quartersQuery.data?.find((q) => q.isActive)
  const assignmentsQuery = useAssignments(
    activeQuarter
      ? { from: activeQuarter.startDate, to: activeQuarter.endDate }
      : { from: today() }
  )

  return (
    <DataState query={assignmentsQuery}>
      {(assignments) => (
        <Tabs value={tab} onValueChange={setTab} className="mt-4">
          <TabsList
            className="grid w-full grid-cols-3"
            style={{ height: "auto" }}
          >
            <TabsTrigger value="my" style={{ minHeight: 44 }}>
              Мої суботи
            </TabsTrigger>
            <TabsTrigger value="schedule" style={{ minHeight: 44 }}>
              Розклад
            </TabsTrigger>
            <TabsTrigger value="profile" style={{ minHeight: 44 }}>
              Профіль
            </TabsTrigger>
          </TabsList>
          <TabsContent value="my" className="mt-4">
            <MyTab member={member} assignments={assignments} />
          </TabsContent>
          <TabsContent value="schedule" className="mt-4">
            <ScheduleTab member={member} assignments={assignments} />
          </TabsContent>
          <TabsContent value="profile" className="mt-4">
            <ProfileTab member={member} assignments={assignments} />
          </TabsContent>
        </Tabs>
      )}
    </DataState>
  )
}

function MyTab({
  member,
  assignments,
}: {
  member: Member
  assignments: Assignment[]
}) {
  const t = today()
  const markUnavailable = useMarkUnavailable()
  const revert = useRevert()
  const claim = useClaim()

  const mine = assignments
    .filter(
      (a) => a.memberId === member.id && a.date >= t && a.status !== "cancelled"
    )
    .sort((a, b) => a.date.localeCompare(b.date))

  const myClassNames = new Set(
    assignments.filter((a) => a.memberId === member.id).map((a) => a.className)
  )

  // ponytail: ПОТРІБНА ЗАМІНА scoped by className heuristic; server validates pool
  const needsSub = assignments
    .filter(
      (a) =>
        a.status === "needs_substitute" &&
        a.memberId !== member.id &&
        a.date >= t &&
        myClassNames.has(a.className)
    )
    .sort((a, b) => a.date.localeCompare(b.date))

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="font-medium">
          Привіт, {member.displayName ?? member.fullName}
        </p>
        <p className="text-sm text-muted-foreground">
          Найближча твоя субота — {mine[0] ? formatShort(mine[0].date) : "—"}
        </p>
      </div>

      {!member.telegramLinkedAt && (
        <p className="text-sm text-muted-foreground">
          Telegram не привʼязано — попроси адміністратора надіслати посилання.
        </p>
      )}

      <div className="flex flex-col gap-2">
        {mine.length === 0 && (
          <p className="text-sm text-muted-foreground">Немає призначень</p>
        )}
        {mine.map((a) => {
          const badge = STATUS_BADGE[a.status]
          const origName = nameFor(assignments, a.originalMemberId)
          return (
            <Card key={a.id}>
              <CardContent className="flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{formatShort(a.date)}</p>
                    <p className="text-sm text-muted-foreground">
                      {a.className}
                    </p>
                    {origName && (
                      <p className="text-sm text-muted-foreground">
                        заміна замість {origName}
                      </p>
                    )}
                  </div>
                  {badge && <Badge variant={badge.variant}>{badge.label}</Badge>}
                </div>
                {(a.status === "planned" || a.status === "confirmed") && (
                  <ConfirmDialog
                    trigger={
                      <Button variant="outline" className="min-h-11">
                        Не зможу
                      </Button>
                    }
                    title="Не зможеш прийти?"
                    description="Адміністратори отримають сповіщення. Якщо передумаєш — слот можна повернути, поки заміну не знайдено."
                    confirmLabel="Не зможу"
                    destructive
                    onConfirm={() =>
                      markUnavailable.mutate(
                        { id: a.id },
                        { onSuccess: () => toast.success("Позначено «не зможу»") }
                      )
                    }
                  />
                )}
                {a.status === "needs_substitute" && (
                  <Button
                    variant="outline"
                    className="min-h-11"
                    onClick={() => revert.mutate({ id: a.id })}
                  >
                    Передумала — зможу
                  </Button>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {needsSub.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">ПОТРІБНА ЗАМІНА</p>
          {needsSub.map((a) => (
            <Card key={a.id} className="bg-destructive/5">
              <CardContent className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-medium">
                    {a.className} · {formatShort(a.date)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {a.memberName ?? "Вчитель"} не зможе
                  </p>
                </div>
                <Button
                  className="min-h-11"
                  onClick={() => claim.mutate({ id: a.id })}
                >
                  Візьму
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function ScheduleTab({
  member,
  assignments,
}: {
  member: Member
  assignments: Assignment[]
}) {
  const t = today()
  const dates = [...new Set(assignments.filter((a) => a.date >= t).map((a) => a.date))]
    .sort()
    .slice(0, 5)

  return (
    <div className="flex flex-col gap-3">
      {dates.length === 0 && (
        <p className="text-sm text-muted-foreground">Немає найближчих субот</p>
      )}
      {dates.map((date) => {
        const rows = assignments
          .filter((a) => a.date === date)
          .sort((a, b) => a.className.localeCompare(b.className))
        return (
          <Card key={date}>
            <CardContent className="flex flex-col gap-1.5">
              <p className="text-sm font-medium">{formatShort(date)}</p>
              {rows.map((a) => {
                const mine = a.memberId === member.id
                return (
                  <div key={a.id} className="flex items-center gap-1.5 text-sm">
                    {mine && <span className="size-1.5 rounded-full bg-primary" />}
                    <span className={mine ? "font-semibold" : ""}>
                      {a.className}: {a.memberName ?? "вільно"}
                    </span>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

function ProfileTab({
  member,
  assignments,
}: {
  member: Member
  assignments: Assignment[]
}) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const quarterCount = assignments.filter(
    (a) => a.memberId === member.id && a.status !== "cancelled"
  ).length

  async function handleLogout() {
    await signOut()
    qc.invalidateQueries({ queryKey: ["me"] })
    navigate({ to: "/login" })
  }

  return (
    <div className="flex flex-col gap-3">
      <Card>
        <CardContent className="flex items-center gap-3">
          <Avatar size="lg">
            <AvatarFallback>{initials(member.fullName)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{member.fullName}</p>
            {member.phone && (
              <p className="text-sm text-muted-foreground">{member.phone}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center justify-between">
          <span className="text-sm">Telegram</span>
          {member.telegramLinkedAt ? (
            <Badge variant="secondary">
              привязано
              {member.telegramUsername ? ` · @${member.telegramUsername}` : ""}
            </Badge>
          ) : (
            <Badge variant="outline">не привязано</Badge>
          )}
        </CardContent>
      </Card>

      <ClassesCard memberId={member.id} />

      <Card>
        <CardContent className="flex items-center justify-between">
          <span className="text-sm">Субот у цьому кварталі</span>
          <span className="font-medium">{quarterCount}</span>
        </CardContent>
      </Card>

      <Button variant="outline" className="min-h-11" onClick={handleLogout}>
        Вийти
      </Button>
    </div>
  )
}

function ClassesCard({ memberId }: { memberId: string }) {
  const classesQuery = useClasses()

  return (
    <Card>
      <CardContent className="flex flex-col gap-2">
        <p className="text-sm font-medium">Мої класи</p>
        <DataState query={classesQuery}>
          {(classes) => (
            <div className="flex flex-col gap-1.5">
              {classes.map((c) => (
                <ClassPoolRow key={c.id} classId={c.id} name={c.name} memberId={memberId} />
              ))}
            </div>
          )}
        </DataState>
      </CardContent>
    </Card>
  )
}

function ClassPoolRow({
  classId,
  name,
  memberId,
}: {
  classId: string
  name: string
  memberId: string
}) {
  const teachersQuery = useClassTeachers(classId)
  const entry = teachersQuery.data?.find((t) => t.memberId === memberId)
  if (!entry) return null

  return (
    <div className="flex items-center justify-between text-sm">
      <span>{name}</span>
      {entry.isPrimary && <Badge variant="secondary">основний</Badge>}
    </div>
  )
}
