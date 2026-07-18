import { createFileRoute, Link } from "@tanstack/react-router"
import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useAssignments, useClasses, useMembers } from "@/lib/hooks"
import type { Assignment, Class, Member } from "@/lib/types"

export const Route = createFileRoute("/_authed/")({ component: DashboardPage })

function formatDate(dateISO: string) {
  const [y, m, d] = dateISO.split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString("uk-UA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function isGap(a: Assignment | undefined) {
  return !a || a.memberId === null || a.status === "needs_substitute"
}

function DashboardPage() {
  const todayISO = new Date().toISOString().slice(0, 10)
  const assignmentsQuery = useAssignments({ from: todayISO })
  const membersQuery = useMembers(true)
  const classesQuery = useClasses()

  return (
    <>
      <PageHeader title="Панель" />
      {assignmentsQuery.isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : assignmentsQuery.error ? (
        <p className="text-sm text-destructive">
          Помилка: {assignmentsQuery.error.message}
        </p>
      ) : (
        <DashboardContent
          assignments={assignmentsQuery.data ?? []}
          members={membersQuery.error ? undefined : membersQuery.data}
          classes={classesQuery.error ? undefined : classesQuery.data}
        />
      )}
    </>
  )
}

function DashboardContent({
  assignments,
  members,
  classes,
}: {
  assignments: Assignment[]
  members: Member[] | undefined
  classes: Class[] | undefined
}) {
  const nearestDate = assignments
    .map((a) => a.date)
    .sort()
    .at(0)

  const gaps = assignments
    .filter(isGap)
    .sort((a, b) => a.date.localeCompare(b.date))

  const unlinkedMembers = members?.filter((m) => m.telegramUserId === null)

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {classes && (
        <Card>
          <CardHeader>
            <CardTitle>
              {nearestDate
                ? `Найближча субота: ${formatDate(nearestDate)}`
                : "Найближча субота"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {nearestDate ? (
              <ul className="flex flex-col gap-2">
                {classes.map((cls) => {
                  const a = assignments.find(
                    (x) => x.classId === cls.id && x.date === nearestDate
                  )
                  return (
                    <li
                      key={cls.id}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="text-foreground">{cls.name}</span>
                      <span className="flex items-center gap-2">
                        <span
                          className={
                            a?.memberName
                              ? "text-foreground"
                              : "text-muted-foreground"
                          }
                        >
                          {a?.memberName ?? "не призначено"}
                        </span>
                        {isGap(a) && (
                          <Badge variant="destructive">
                            {a?.status === "needs_substitute"
                              ? "потрібна заміна"
                              : "вільно"}
                          </Badge>
                        )}
                      </span>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Немає даних</p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Дірки в розкладі</CardTitle>
        </CardHeader>
        <CardContent>
          {gaps.length === 0 ? (
            <p className="text-sm text-muted-foreground">Дірок немає</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {gaps.map((a) => (
                <li key={a.id}>
                  <Link
                    to="/schedule"
                    className="flex items-center justify-between gap-2 text-foreground hover:underline"
                  >
                    <span>{a.className}</span>
                    <span className="text-muted-foreground">
                      {formatDate(a.date)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {unlinkedMembers && (
        <Card>
          <CardHeader>
            <CardTitle>
              Не привязані до Telegram ({unlinkedMembers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {unlinkedMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground">Усі привязані</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {unlinkedMembers.map((m) => (
                  <li key={m.id}>
                    <Link
                      to="/members"
                      className="text-foreground hover:underline"
                    >
                      {m.fullName}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
