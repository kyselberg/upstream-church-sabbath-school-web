import { createFileRoute } from "@tanstack/react-router"
import { PageHeader } from "@/components/page-header"
import { DataState } from "@/components/data-state"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useMe, useAssignments } from "@/lib/hooks"
import type { Assignment } from "@/lib/types"

export const Route = createFileRoute("/_authed/my")({ component: MyPage })

const STATUS_LABEL: Record<string, string> = {
  planned: "Заплановано",
  confirmed: "Підтверджено",
  needs_substitute: "Потрібна заміна",
  cancelled: "Скасовано",
}

function formatDate(dateISO: string) {
  const [y, m, d] = dateISO.split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString("uk-UA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function toISO(date: Date) {
  return date.toISOString().slice(0, 10)
}

function MyPage() {
  const meQuery = useMe()
  const memberId = meQuery.data?.member?.id

  const today = new Date()
  const in60Days = new Date(today)
  in60Days.setDate(in60Days.getDate() + 60)

  const assignmentsQuery = useAssignments({
    from: toISO(today),
    to: toISO(in60Days),
  })

  return (
    <>
      <PageHeader title="Мій розклад" />
      <DataState query={meQuery}>
        {(me) =>
          !me.member ? (
            <p className="text-sm text-muted-foreground">
              Ваш обліковий запис не привязаний до вчителя. Зверніться до
              адміністратора.
            </p>
          ) : (
            <DataState query={assignmentsQuery}>
              {(assignments) => (
                <MyAssignments assignments={assignments} memberId={memberId!} />
              )}
            </DataState>
          )
        }
      </DataState>
    </>
  )
}

function MyAssignments({
  assignments,
  memberId,
}: {
  assignments: Assignment[]
  memberId: string
}) {
  const mine = assignments
    .filter((a) => a.memberId === memberId)
    .sort((a, b) => a.date.localeCompare(b.date))

  const myClassNames = [...new Set(mine.map((a) => a.className))].sort()

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Найближчі суботи</CardTitle>
        </CardHeader>
        <CardContent>
          {mine.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Немає призначень на найближчі 60 днів
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {mine.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="text-foreground">{a.className}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-muted-foreground">
                      {formatDate(a.date)}
                    </span>
                    {a.status !== "planned" && a.status !== "confirmed" && (
                      <Badge variant="destructive">
                        {STATUS_LABEL[a.status] ?? a.status}
                      </Badge>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Мої класи</CardTitle>
        </CardHeader>
        <CardContent>
          {myClassNames.length === 0 ? (
            <p className="text-sm text-muted-foreground">Немає класів</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {myClassNames.map((name) => (
                <li key={name} className="text-foreground">
                  {name}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
