import { useEffect, useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import {
  Pencil,
  Trash2,
  KeyRound,
  MoreHorizontal,
  Archive,
  ArchiveRestore,
  Plus,
} from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { DataState } from "@/components/data-state"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { TelegramTokenDialog } from "@/components/telegram-token-dialog"
import { MembersLoadCard } from "@/components/members-load-card"
import { usePerms } from "@/lib/perms"
import {
  useMembers,
  useCreateMember,
  useUpdateMember,
  useDeleteMember,
  useQuarters,
  useAssignments,
} from "@/lib/hooks"
import type { Member } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

export const Route = createFileRoute("/_authed/members")({
  component: MembersPage,
})

type MemberFormState = {
  fullName: string
  displayName: string
  phone: string
  telegramUsername: string
  isActive: boolean
}

const emptyForm: MemberFormState = {
  fullName: "",
  displayName: "",
  phone: "",
  telegramUsername: "",
  isActive: true,
}

function MembersPage() {
  const { has } = usePerms()
  const canManage = has("member.manage")
  const canLinkTelegram = has("telegram.link")

  const [pollToken, setPollToken] = useState(false)
  const membersQuery = useMembers(false, pollToken ? 3000 : undefined)
  const members = membersQuery.data ?? []
  const activeMembers = members.filter((m) => m.isActive)

  const quartersQuery = useQuarters()
  const quarters = quartersQuery.data ?? []
  const quarter = quarters.find((q) => q.isActive) ?? quarters.at(0)
  const assignmentsQuery = useAssignments(
    quarter ? { from: quarter.startDate, to: quarter.endDate } : {}
  )
  const assignments = assignmentsQuery.data ?? []

  const createMember = useCreateMember()
  const updateMember = useUpdateMember()
  const deleteMember = useDeleteMember()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Member | null>(null)
  const [form, setForm] = useState<MemberFormState>(emptyForm)

  const [tokenMemberId, setTokenMemberId] = useState<string | null>(null)
  const tokenMember = members.find((m) => m.id === tokenMemberId) ?? null

  useEffect(() => {
    if (tokenMember?.telegramLinkedAt) setPollToken(false)
  }, [tokenMember?.telegramLinkedAt])

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setFormOpen(true)
  }

  function openEdit(member: Member) {
    setEditing(member)
    setForm({
      fullName: member.fullName,
      displayName: member.displayName ?? "",
      phone: member.phone ?? "",
      telegramUsername: member.telegramUsername ?? "",
      isActive: member.isActive,
    })
    setFormOpen(true)
  }

  function openToken(member: Member) {
    setTokenMemberId(member.id)
    setPollToken(true)
  }

  function submitForm() {
    if (editing) {
      updateMember.mutate(
        {
          id: editing.id,
          fullName: form.fullName,
          displayName:
            form.displayName.trim() === "" ? null : form.displayName.trim(),
          phone: form.phone.trim() === "" ? null : form.phone.trim(),
          telegramUsername:
            form.telegramUsername.trim() === ""
              ? null
              : form.telegramUsername.trim(),
          isActive: form.isActive,
        },
        { onSuccess: () => setFormOpen(false) }
      )
    } else {
      createMember.mutate(
        {
          fullName: form.fullName,
          displayName: form.displayName || undefined,
          phone: form.phone || undefined,
          telegramUsername: form.telegramUsername || undefined,
        },
        { onSuccess: () => setFormOpen(false) }
      )
    }
  }

  return (
    <>
      <PageHeader
        title="Вчителі"
        action={
          canManage ? (
            <Button onClick={openCreate}>
              <Plus /> Додати вчителя
            </Button>
          ) : undefined
        }
      />

      <DataState
        query={membersQuery}
        empty={<p className="text-sm text-muted-foreground">Немає даних</p>}
      >
        {(list) => (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ПІБ</TableHead>
                  <TableHead>Імʼя</TableHead>
                  <TableHead>Телефон</TableHead>
                  <TableHead>Telegram</TableHead>
                  <TableHead>Статус</TableHead>
                  {(canManage || canLinkTelegram) && (
                    <TableHead className="w-10" />
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((member) => (
                  <TableRow
                    key={member.id}
                    className={!member.isActive ? "opacity-55" : undefined}
                  >
                    <TableCell className="font-medium">
                      {member.fullName}
                    </TableCell>
                    <TableCell>{member.displayName ?? "—"}</TableCell>
                    <TableCell>{member.phone ?? "—"}</TableCell>
                    <TableCell>
                      {member.telegramUserId != null ? (
                        <Badge variant="secondary">
                          {member.telegramUsername
                            ? `@${member.telegramUsername}`
                            : "привязано"}
                        </Badge>
                      ) : (
                        <Badge variant="outline">не привязано</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={member.isActive ? "secondary" : "outline"}>
                        {member.isActive ? "активний" : "архів"}
                      </Badge>
                    </TableCell>
                    {(canManage || canLinkTelegram) && (
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Дії для ${member.fullName}`}
                            >
                              <MoreHorizontal className="opacity-50" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {canManage && (
                              <DropdownMenuItem
                                onSelect={() => openEdit(member)}
                              >
                                <Pencil /> Редагувати
                              </DropdownMenuItem>
                            )}
                            {canLinkTelegram && (
                              <DropdownMenuItem
                                onSelect={() => openToken(member)}
                              >
                                <KeyRound /> Токен Telegram
                              </DropdownMenuItem>
                            )}
                            {canManage && (
                              <DropdownMenuItem
                                onSelect={() =>
                                  updateMember.mutate({
                                    id: member.id,
                                    isActive: !member.isActive,
                                  })
                                }
                              >
                                {member.isActive ? (
                                  <>
                                    <Archive /> В архів
                                  </>
                                ) : (
                                  <>
                                    <ArchiveRestore /> Відновити
                                  </>
                                )}
                              </DropdownMenuItem>
                            )}
                            {canManage && (
                              <>
                                <DropdownMenuSeparator />
                                <ConfirmDialog
                                  trigger={
                                    <DropdownMenuItem
                                      variant="destructive"
                                      onSelect={(e) => e.preventDefault()}
                                    >
                                      <Trash2 /> Видалити
                                    </DropdownMenuItem>
                                  }
                                  title={`Видалити ${member.fullName}?`}
                                  description="Цю дію не можна скасувати."
                                  confirmLabel="Видалити"
                                  destructive
                                  onConfirm={() =>
                                    deleteMember.mutate(member.id)
                                  }
                                />
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="mt-4">
              <MembersLoadCard
                members={activeMembers}
                assignments={assignments}
                quarterName={quarter?.name}
              />
            </div>
          </>
        )}
      </DataState>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Редагувати вчителя" : "Додати вчителя"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fullName">ПІБ*</Label>
              <Input
                id="fullName"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              />
            </div>
            {editing && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="displayName">Імʼя</Label>
                    <Input
                      id="displayName"
                      value={form.displayName}
                      onChange={(e) =>
                        setForm({ ...form, displayName: e.target.value })
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="phone">Телефон</Label>
                    <Input
                      id="phone"
                      value={form.phone}
                      onChange={(e) =>
                        setForm({ ...form, phone: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="telegramUsername">Telegram username</Label>
                  <Input
                    id="telegramUsername"
                    value={form.telegramUsername}
                    onChange={(e) =>
                      setForm({ ...form, telegramUsername: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground">без @</p>
                </div>
              </>
            )}
            {editing && (
              <div className="flex items-center justify-between">
                <Label htmlFor="isActive">
                  активний (вимкнено = архів, без видалення)
                </Label>
                <Switch
                  id="isActive"
                  checked={form.isActive}
                  onCheckedChange={(checked) =>
                    setForm({ ...form, isActive: checked })
                  }
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Скасувати
            </Button>
            <Button
              onClick={submitForm}
              disabled={
                !form.fullName ||
                createMember.isPending ||
                updateMember.isPending
              }
            >
              Зберегти
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
    </>
  )
}
