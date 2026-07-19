import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card"
import type { Assignment, Member } from "@/lib/types"

export function MembersLoadCard({
  members,
  assignments,
  quarterName,
}: {
  members: Member[]
  assignments: Assignment[]
  quarterName?: string
}) {
  if (!quarterName || assignments.length === 0) return null

  const today = new Date().toISOString().slice(0, 10)

  const rows = members
    .filter((m) => m.isActive)
    .map((m) => {
      const own = assignments.filter(
        (a) => a.memberId === m.id && a.status !== "cancelled"
      )
      const done = own.filter((a) => a.date < today).length
      const future = own.filter((a) => a.date >= today).length
      const subs = own.filter((a) => a.originalMemberId != null).length
      return { member: m, total: own.length, done, future, subs }
    })
    .sort((a, b) => b.total - a.total)

  const max = Math.max(1, ...rows.map((r) => r.total))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Навантаження · {quarterName}</span>
          <div className="flex items-center gap-3 text-[11px] font-normal text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-[color:var(--chart-3)]" />
              проведено
            </span>
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-primary" />
              майбутні
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {rows.map(({ member, total, done, future, subs }) => (
          <div key={member.id} className="flex items-center gap-3">
            <span className="w-32 min-w-0 shrink-0 truncate">
              {member.displayName ?? member.fullName}
            </span>
            <div className="h-3 flex-1 flex overflow-hidden rounded-full bg-muted">
              <div
                style={{ width: `${(done / max) * 100}%` }}
                className="bg-[color:var(--chart-3)]"
              />
              <div
                style={{ width: `${(future / max) * 100}%` }}
                className="bg-primary"
              />
            </div>
            <span className="w-6 shrink-0 text-right font-medium">
              {total}
            </span>
            <span className="w-40 shrink-0 text-[11px] text-muted-foreground">
              {done} проведено · {future} майбутні · {subs} заміни
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
