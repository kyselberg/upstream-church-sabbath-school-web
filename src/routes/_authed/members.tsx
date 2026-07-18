import { useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { Pencil, Trash2, KeyRound, Copy, Plus } from "lucide-react"
import { toast } from "sonner"
import { PageHeader } from "@/components/page-header"
import { DataState } from "@/components/data-state"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { usePerms } from "@/lib/perms"
import {
  useMembers,
  useCreateMember,
  useUpdateMember,
  useDeleteMember,
  useCreateTelegramToken,
} from "@/lib/hooks"
import type { Member } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
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

  const [activeOnly, setActiveOnly] = useState(true)
  const membersQuery = useMembers(activeOnly)

  const createMember = useCreateMember()
  const updateMember = useUpdateMember()
  const deleteMember = useDeleteMember()
  const createToken = useCreateTelegramToken()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Member | null>(null)
  const [form, setForm] = useState<MemberFormState>(emptyForm)

  const [tokenOpen, setTokenOpen] = useState(false)
  const [token, setToken] = useState<{
    deepLink: string
    expiresAt: string
  } | null>(null)

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

  function issueToken(memberId: string) {
    createToken.mutate(memberId, {
      onSuccess: (data) => {
        setToken({ deepLink: data.deepLink, expiresAt: data.expiresAt })
        setTokenOpen(true)
      },
    })
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

      <Tabs
        value={activeOnly ? "active" : "all"}
        onValueChange={(v) => setActiveOnly(v === "active")}
        className="mb-4"
      >
        <TabsList>
          <TabsTrigger value="active">Тільки активні</TabsTrigger>
          <TabsTrigger value="all">Усі</TabsTrigger>
        </TabsList>
      </Tabs>

      <DataState
        query={membersQuery}
        empty={<p className="text-sm text-muted-foreground">Немає даних</p>}
      >
        {(members) => (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ПІБ</TableHead>
                <TableHead>Відображуване ім'я</TableHead>
                <TableHead>Телефон</TableHead>
                <TableHead>Telegram</TableHead>
                <TableHead>Статус</TableHead>
                {canManage && <TableHead className="w-10" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
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
                      <span className="text-muted-foreground">
                        не привязано
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={member.isActive ? "default" : "outline"}>
                      {member.isActive ? "активний" : "неактивний"}
                    </Badge>
                  </TableCell>
                  {canManage && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Дії для ${member.fullName}`}
                          >
                            <Pencil className="opacity-50" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => openEdit(member)}>
                            <Pencil /> Редагувати
                          </DropdownMenuItem>
                          {canLinkTelegram && !member.telegramLinkedAt && (
                            <DropdownMenuItem
                              onSelect={() => issueToken(member.id)}
                            >
                              <KeyRound /> Токен онбордингу
                            </DropdownMenuItem>
                          )}
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
                            onConfirm={() => deleteMember.mutate(member.id)}
                          />
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="displayName">Відображуване ім'я</Label>
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
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
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
            </div>
            {editing && (
              <div className="flex items-center justify-between">
                <Label htmlFor="isActive">Активний</Label>
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

      <Dialog open={tokenOpen} onOpenChange={setTokenOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Токен онбордингу</DialogTitle>
          </DialogHeader>
          {token && (
            <div className="flex flex-col gap-3">
              <div className="flex gap-2">
                <Input value={token.deepLink} readOnly />
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Копіювати посилання"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(token.deepLink)
                      toast.success("Скопійовано")
                    } catch {
                      toast.error("Не вдалося скопіювати")
                    }
                  }}
                >
                  <Copy />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Діє до: {new Date(token.expiresAt).toLocaleString("uk-UA")}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
