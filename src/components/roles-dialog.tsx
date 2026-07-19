import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import {
  useRoles,
  useMemberRoles,
  useGrantRole,
  useRevokeRole,
} from "@/lib/hooks"
import type { Member } from "@/lib/types"

type RoleKey = "teacher" | "admin" | "superadmin"

const ROLE_ROWS: { key: RoleKey; description: string }[] = [
  { key: "teacher", description: "перегляд + свої слоти" },
  { key: "admin", description: "дані, розклад, оголошення" },
  { key: "superadmin", description: "ролі й налаштування" },
]

export function RolesDialog({
  member,
  open,
  onOpenChange,
}: {
  member: Member | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const roles = useRoles()
  const memberRoles = useMemberRoles(member?.id)
  const grantRole = useGrantRole()
  const revokeRole = useRevokeRole()

  const [desired, setDesired] = useState<Record<RoleKey, boolean>>({
    teacher: true,
    admin: false,
    superadmin: false,
  })

  useEffect(() => {
    if (!open || !memberRoles.data) return
    const current = new Set(memberRoles.data.map((r) => r.key))
    setDesired({
      teacher: current.has("teacher") || current.size === 0,
      admin: current.has("admin"),
      superadmin: current.has("superadmin"),
    })
  }, [open, memberRoles.data])

  async function handleSave() {
    if (!member || !roles.data) return
    const keyToId = new Map(roles.data.map((r) => [r.key, r.id]))
    const current = new Set((memberRoles.data ?? []).map((r) => r.key))
    const desiredKeys = new Set<string>(
      (Object.keys(desired) as RoleKey[]).filter((k) => desired[k])
    )
    if (desiredKeys.size === 0) desiredKeys.add("teacher")

    const toGrant = [...desiredKeys].filter((k) => !current.has(k))
    const toRevoke = [...current].filter((k) => !desiredKeys.has(k))

    const grants = toGrant.map((key) =>
      grantRole.mutateAsync({ memberId: member.id, roleKey: key })
    )
    const revokes = toRevoke
      .map((key) => keyToId.get(key))
      .filter((id): id is string => !!id)
      .map((roleId) => revokeRole.mutateAsync({ memberId: member.id, roleId }))

    await Promise.all([...grants, ...revokes])
    onOpenChange(false)
  }

  const saving = grantRole.isPending || revokeRole.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ролі · {member?.fullName}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          {ROLE_ROWS.map((row) => (
            <div
              key={row.key}
              className="flex items-center justify-between gap-3"
            >
              <div>
                <p className="font-mono">{row.key}</p>
                <p className="text-xs text-muted-foreground">
                  {row.description}
                </p>
              </div>
              <Switch
                checked={desired[row.key]}
                onCheckedChange={(checked) =>
                  setDesired((prev) => ({ ...prev, [row.key]: checked }))
                }
              />
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Скасувати
          </Button>
          <Button onClick={handleSave} disabled={saving || !roles.data}>
            Зберегти
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
