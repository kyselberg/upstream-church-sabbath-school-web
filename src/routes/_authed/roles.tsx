import { useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { X } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { DataState } from "@/components/data-state"
import { MemberCombobox } from "@/components/member-combobox"
import { usePerms } from "@/lib/perms"
import {
  useRoles,
  usePermissions,
  useMembers,
  useMemberRoles,
  useGrantRole,
  useRevokeRole,
} from "@/lib/hooks"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export const Route = createFileRoute("/_authed/roles")({
  component: RolesPage,
})

function RolesPage() {
  const { has, isLoading } = usePerms()

  if (isLoading) return null
  if (!has("role.manage")) {
    return (
      <>
        <PageHeader title="Ролі" />
        <p className="text-sm text-muted-foreground">Немає доступу</p>
      </>
    )
  }

  return (
    <>
      <PageHeader title="Ролі" />
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Ролі та дозволи</TabsTrigger>
          <TabsTrigger value="assign">Призначення ролей</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <OverviewTab />
        </TabsContent>
        <TabsContent value="assign">
          <AssignTab />
        </TabsContent>
      </Tabs>
    </>
  )
}

function OverviewTab() {
  const roles = useRoles()
  const permissions = usePermissions()

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Ролі</CardTitle>
        </CardHeader>
        <CardContent>
          <DataState
            query={roles}
            empty={<p className="text-sm text-muted-foreground">Немає даних</p>}
          >
            {(data) => (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Назва</TableHead>
                    <TableHead>Ключ</TableHead>
                    <TableHead>Опис</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.name}</TableCell>
                      <TableCell className="font-mono text-muted-foreground">
                        {r.key}
                      </TableCell>
                      <TableCell>{r.description ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </DataState>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Дозволи</CardTitle>
        </CardHeader>
        <CardContent>
          <DataState
            query={permissions}
            empty={<p className="text-sm text-muted-foreground">Немає даних</p>}
          >
            {(data) => (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ключ</TableHead>
                    <TableHead>Опис</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-muted-foreground">
                        {p.key}
                      </TableCell>
                      <TableCell>{p.description ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </DataState>
        </CardContent>
      </Card>
    </div>
  )
}

function AssignTab() {
  const members = useMembers(true)
  const roles = useRoles()
  const [memberId, setMemberId] = useState<string | null>(null)
  const [roleToGrant, setRoleToGrant] = useState<string | undefined>(undefined)

  const memberRoles = useMemberRoles(memberId ?? undefined)
  const grantRole = useGrantRole()
  const revokeRole = useRevokeRole()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Призначення ролей</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <DataState query={members}>
          {(data) => (
            <MemberCombobox
              members={data}
              value={memberId}
              onChange={(id) => {
                setMemberId(id)
                setRoleToGrant(undefined)
              }}
              placeholder="Оберіть вчителя"
            />
          )}
        </DataState>

        {memberId && (
          <>
            <div>
              <p className="mb-2 text-sm font-medium">Поточні ролі</p>
              <DataState
                query={memberRoles}
                empty={
                  <p className="text-sm text-muted-foreground">Немає ролей</p>
                }
              >
                {(data) => (
                  <div className="flex flex-wrap gap-2">
                    {data.map((r) => (
                      <Badge key={r.id} variant="secondary" className="gap-1">
                        {r.name}
                        <button
                          type="button"
                          onClick={() =>
                            revokeRole.mutate({ memberId, roleId: r.id })
                          }
                          disabled={revokeRole.isPending}
                          aria-label={`Відкликати роль ${r.name}`}
                        >
                          <X className="size-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </DataState>
            </div>

            <div className="flex items-end gap-2">
              <div className="flex-1">
                <p className="mb-2 text-sm font-medium">Надати роль</p>
                <DataState query={roles}>
                  {(data) => (
                    <Select value={roleToGrant} onValueChange={setRoleToGrant}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Оберіть роль" />
                      </SelectTrigger>
                      <SelectContent>
                        {data.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </DataState>
              </div>
              <Button
                disabled={!roleToGrant || grantRole.isPending}
                onClick={() => {
                  if (!roleToGrant) return
                  grantRole.mutate(
                    { memberId, roleId: roleToGrant },
                    { onSuccess: () => setRoleToGrant(undefined) }
                  )
                }}
              >
                Надати
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
