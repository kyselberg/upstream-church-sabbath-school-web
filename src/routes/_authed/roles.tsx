import { useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { PageHeader } from "@/components/page-header"
import { DataState } from "@/components/data-state"
import { RolesDialog } from "@/components/roles-dialog"
import { usePerms } from "@/lib/perms"
import { useMembers, useMemberRoles } from "@/lib/hooks"
import type { Member } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"

export const Route = createFileRoute("/_authed/roles")({
  component: RolesPage,
})

const ROLE_BADGE_VARIANT: Record<
  string,
  "default" | "secondary" | "outline"
> = {
  superadmin: "default",
  admin: "secondary",
  teacher: "outline",
}

// ponytail: hardcoded here since the API doesn't expose role→permissions;
// keep in sync with api/src/db/seed.ts ROLE_PERMISSIONS
const PERMISSION_MATRIX: {
  group: string
  perms: { key: string; t: boolean; a: boolean; s: boolean }[]
}[] = [
  {
    group: "Розклад",
    perms: [
      { key: "schedule.read", t: true, a: true, s: true },
      { key: "schedule.assign.own", t: true, a: true, s: true },
      { key: "schedule.assign", t: false, a: true, s: true },
      { key: "swap.propose", t: true, a: true, s: true },
      { key: "swap.approve", t: false, a: true, s: true },
    ],
  },
  {
    group: "Вчителі",
    perms: [
      { key: "member.read", t: true, a: true, s: true },
      { key: "member.manage", t: false, a: true, s: true },
    ],
  },
  {
    group: "Класи",
    perms: [
      { key: "class.read", t: true, a: true, s: true },
      { key: "class.manage", t: false, a: true, s: true },
    ],
  },
  {
    group: "Telegram / оголошення",
    perms: [
      { key: "telegram.link.self", t: true, a: true, s: true },
      { key: "telegram.link", t: false, a: true, s: true },
      { key: "announcement.send", t: false, a: true, s: true },
    ],
  },
  {
    group: "Система",
    perms: [
      { key: "role.manage", t: false, a: false, s: true },
      { key: "settings.manage", t: false, a: false, s: true },
    ],
  },
]

function RolesPage() {
  const { has, isLoading } = usePerms()
  const [activeMember, setActiveMember] = useState<Member | null>(null)

  if (isLoading) return null
  if (!has("role.manage")) {
    return (
      <>
        <PageHeader title="Ролі та доступи" />
        <p className="text-sm text-muted-foreground">Немає доступу</p>
      </>
    )
  }

  return (
    <>
      <PageHeader title="Ролі та доступи" />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(320px,1.2fr) minmax(320px,1fr)",
          gap: "1rem",
        }}
      >
        <TeachersCard onEdit={setActiveMember} />
        <MatrixCard />
      </div>
      <RolesDialog
        member={activeMember}
        open={!!activeMember}
        onOpenChange={(open) => !open && setActiveMember(null)}
      />
    </>
  )
}

function TeachersCard({ onEdit }: { onEdit: (member: Member) => void }) {
  const members = useMembers(true)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ролі вчителів</CardTitle>
      </CardHeader>
      <CardContent>
        <DataState
          query={members}
          empty={<p className="text-sm text-muted-foreground">Немає даних</p>}
        >
          {(data) => (
            <div className="flex flex-col gap-3">
              {data.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between gap-2"
                >
                  <div className="flex flex-1 flex-wrap items-center gap-2">
                    <span className="font-medium">
                      {m.displayName ?? m.fullName}
                    </span>
                    <TeacherRoleBadges memberId={m.id} />
                  </div>
                  <Button variant="outline" size="sm" onClick={() => onEdit(m)}>
                    Змінити
                  </Button>
                </div>
              ))}
            </div>
          )}
        </DataState>
      </CardContent>
    </Card>
  )
}

function TeacherRoleBadges({ memberId }: { memberId: string }) {
  const roles = useMemberRoles(memberId)

  return (
    <DataState query={roles}>
      {(data) =>
        data.length === 0 ? (
          <Badge variant="outline">teacher</Badge>
        ) : (
          <div className="flex flex-wrap gap-1">
            {data.map((r) => (
              <Badge key={r.id} variant={ROLE_BADGE_VARIANT[r.key] ?? "outline"}>
                {r.key}
              </Badge>
            ))}
          </div>
        )
      }
    </DataState>
  )
}

function MatrixCell({ on }: { on: boolean }) {
  return on ? (
    <span className="font-semibold text-primary">✓</span>
  ) : (
    <span className="text-muted-foreground">—</span>
  )
}

function MatrixCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Матриця прав</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Право</TableHead>
              <TableHead>teacher</TableHead>
              <TableHead>admin</TableHead>
              <TableHead>superadmin</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {PERMISSION_MATRIX.flatMap((group) => [
              <TableRow key={`${group.group}-label`}>
                <TableCell
                  colSpan={4}
                  className="font-mono text-[10px] text-muted-foreground"
                >
                  {group.group}
                </TableCell>
              </TableRow>,
              ...group.perms.map((p) => (
                <TableRow key={p.key}>
                  <TableCell className="font-mono text-muted-foreground">
                    {p.key}
                  </TableCell>
                  <TableCell>
                    <MatrixCell on={p.t} />
                  </TableCell>
                  <TableCell>
                    <MatrixCell on={p.a} />
                  </TableCell>
                  <TableCell>
                    <MatrixCell on={p.s} />
                  </TableCell>
                </TableRow>
              )),
            ])}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
