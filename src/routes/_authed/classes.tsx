import { useEffect, useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { Plus, X } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { DataState } from "@/components/data-state"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { MemberCombobox } from "@/components/member-combobox"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  useClasses,
  useMembers,
  useCreateClass,
  useUpdateClass,
  useDeleteClass,
  useClassTeachers,
  useAddTeacher,
  useRemoveTeacher,
} from "@/lib/hooks"
import { usePerms } from "@/lib/perms"
import type { Class, CreateClassInput, Member } from "@/lib/types"

export const Route = createFileRoute("/_authed/classes")({
  component: ClassesPage,
})

function ClassesPage() {
  const { has } = usePerms()
  const canManage = has("class.manage")
  const classesQuery = useClasses()
  const membersQuery = useMembers(true)
  const createClass = useCreateClass()
  const updateClass = useUpdateClass()
  const deleteClass = useDeleteClass()

  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<Class | null>(null)
  const [teachersFor, setTeachersFor] = useState<Class | null>(null)

  return (
    <>
      <PageHeader
        title="Класи"
        action={
          canManage && (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus /> Додати клас
            </Button>
          )
        }
      />

      <DataState
        query={classesQuery}
        empty={<p className="text-sm text-muted-foreground">Немає даних</p>}
      >
        {(classes) => (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Назва</TableHead>
                <TableHead>Опис</TableHead>
                <TableHead>Порядок</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="text-right">Дії</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {classes.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.description ?? "—"}
                  </TableCell>
                  <TableCell>{c.sortOrder}</TableCell>
                  <TableCell>
                    <Badge variant={c.isActive ? "default" : "secondary"}>
                      {c.isActive ? "Активний" : "Неактивний"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setTeachersFor(c)}
                      >
                        Вчителі
                      </Button>
                      {canManage && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditing(c)}
                          >
                            Редагувати
                          </Button>
                          <ConfirmDialog
                            trigger={
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive"
                              >
                                Видалити
                              </Button>
                            }
                            title={`Видалити клас «${c.name}»?`}
                            confirmLabel="Видалити"
                            destructive
                            onConfirm={() => deleteClass.mutate(c.id)}
                          />
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DataState>

      <ClassFormDialog
        key="create"
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={(input) =>
          createClass.mutate(input, { onSuccess: () => setCreateOpen(false) })
        }
        isPending={createClass.isPending}
      />

      <ClassFormDialog
        key={editing?.id ?? "edit"}
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
        classItem={editing}
        onSubmit={(input) =>
          editing &&
          updateClass.mutate(
            { id: editing.id, ...input },
            { onSuccess: () => setEditing(null) }
          )
        }
      />

      <TeachersDialog
        classItem={teachersFor}
        onOpenChange={(open) => !open && setTeachersFor(null)}
        members={membersQuery.data ?? []}
        canManage={canManage}
      />
    </>
  )
}

function ClassFormDialog({
  open,
  onOpenChange,
  classItem,
  onSubmit,
  isPending,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  classItem?: Class | null
  onSubmit: (input: CreateClassInput & { isActive?: boolean }) => void
  isPending?: boolean
}) {
  const [name, setName] = useState(classItem?.name ?? "")
  const [description, setDescription] = useState(classItem?.description ?? "")
  const [sortOrder, setSortOrder] = useState(String(classItem?.sortOrder ?? 0))
  const [isActive, setIsActive] = useState(classItem?.isActive ?? true)

  useEffect(() => {
    if (!open && !classItem) {
      setName("")
      setDescription("")
      setSortOrder("0")
      setIsActive(true)
    }
  }, [open, classItem])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {classItem ? "Редагувати клас" : "Новий клас"}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="class-name">Назва*</Label>
            <Input
              id="class-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="class-description">Опис</Label>
            <Textarea
              id="class-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="class-sort-order">Порядок</Label>
            <Input
              id="class-sort-order"
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            />
          </div>
          {classItem && (
            <div className="flex items-center justify-between">
              <Label htmlFor="class-active">Активний</Label>
              <Switch
                id="class-active"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            disabled={!name.trim() || !!isPending}
            onClick={() =>
              onSubmit({
                name: name.trim(),
                description: description.trim() || undefined,
                sortOrder: Number(sortOrder) || 0,
                ...(classItem ? { isActive } : {}),
              })
            }
          >
            Зберегти
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function TeachersDialog({
  classItem,
  onOpenChange,
  members,
  canManage,
}: {
  classItem: Class | null
  onOpenChange: (open: boolean) => void
  members: Member[]
  canManage: boolean
}) {
  const teachersQuery = useClassTeachers(classItem?.id)
  const addTeacher = useAddTeacher()
  const removeTeacher = useRemoveTeacher()
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)

  useEffect(() => {
    setSelectedMemberId(null)
  }, [classItem?.id])

  const poolIds = new Set((teachersQuery.data ?? []).map((t) => t.memberId))
  const available = members.filter((m) => !poolIds.has(m.id))

  return (
    <Dialog open={!!classItem} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Вчителі класу «{classItem?.name}»</DialogTitle>
        </DialogHeader>
        {classItem && (
          <DataState
            query={teachersQuery}
            empty={
              <p className="text-sm text-muted-foreground">Немає вчителів</p>
            }
          >
            {(teachers) => (
              <ul className="flex flex-col gap-2">
                {teachers.map((t) => (
                  <li
                    key={t.memberId}
                    className="flex items-center justify-between gap-2 rounded-md border p-2"
                  >
                    <span className="flex items-center gap-2">
                      {t.displayName ?? t.fullName}
                      {t.isPrimary && <Badge>Основний</Badge>}
                    </span>
                    {canManage && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Прибрати з класу"
                        onClick={() =>
                          removeTeacher.mutate({
                            classId: classItem.id,
                            memberId: t.memberId,
                          })
                        }
                      >
                        <X />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </DataState>
        )}
        {canManage && classItem && (
          <div className="flex gap-2">
            <MemberCombobox
              members={available}
              value={selectedMemberId}
              onChange={setSelectedMemberId}
            />
            <Button
              disabled={!selectedMemberId}
              onClick={() =>
                selectedMemberId &&
                addTeacher.mutate(
                  { classId: classItem.id, memberId: selectedMemberId },
                  { onSuccess: () => setSelectedMemberId(null) }
                )
              }
            >
              Додати
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
