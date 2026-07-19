import { useEffect, useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { Plus } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { DataState } from "@/components/data-state"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  useSetPrimaryTeacher,
  useQuarters,
  useAssignments,
} from "@/lib/hooks"
import { usePerms } from "@/lib/perms"
import type { Class, CreateClassInput, Member } from "@/lib/types"

export const Route = createFileRoute("/_authed/classes")({
  component: ClassesPage,
})

function pluralTeachers(n: number) {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return "ведучий"
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14))
    return "ведучого"
  return "ведучих"
}

function ClassesPage() {
  const { has } = usePerms()
  const canManage = has("class.manage")
  const classesQuery = useClasses()
  const membersQuery = useMembers(true)
  const quartersQuery = useQuarters()
  const quarters = quartersQuery.data ?? []
  const quarter = quarters.find((q) => q.isActive) ?? quarters.at(0)
  const assignmentsQuery = useAssignments(
    quarter ? { from: quarter.startDate, to: quarter.endDate } : {}
  )
  const assignments = assignmentsQuery.data ?? []
  const today = new Date().toISOString().slice(0, 10)

  const createClass = useCreateClass()
  const updateClass = useUpdateClass()
  const deleteClass = useDeleteClass()

  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<Class | null>(null)

  function classHoles(classId: string) {
    return assignments.filter(
      (a) =>
        a.classId === classId &&
        !a.memberId &&
        a.status !== "cancelled" &&
        a.date >= today
    ).length
  }

  function memberQuarterLoad(memberId: string) {
    return assignments.filter(
      (a) => a.memberId === memberId && a.status !== "cancelled"
    ).length
  }

  function memberClassFuture(classId: string, memberId: string) {
    return assignments.filter(
      (a) =>
        a.classId === classId &&
        a.memberId === memberId &&
        a.status !== "cancelled" &&
        a.date >= today
    ).length
  }

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
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))",
              gap: "1rem",
            }}
          >
            {classes.map((c) => (
              <ClassCard
                key={c.id}
                classItem={c}
                canManage={canManage}
                members={membersQuery.data ?? []}
                holes={classHoles(c.id)}
                memberQuarterLoad={memberQuarterLoad}
                memberClassFuture={memberClassFuture}
                onEdit={() => setEditing(c)}
                onDelete={() => deleteClass.mutate(c.id)}
              />
            ))}
          </div>
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
    </>
  )
}

function ClassCard({
  classItem,
  canManage,
  members,
  holes,
  memberQuarterLoad,
  memberClassFuture,
  onEdit,
  onDelete,
}: {
  classItem: Class
  canManage: boolean
  members: Member[]
  holes: number
  memberQuarterLoad: (memberId: string) => number
  memberClassFuture: (classId: string, memberId: string) => number
  onEdit: () => void
  onDelete: () => void
}) {
  const teachersQuery = useClassTeachers(classItem.id)
  const teachers = teachersQuery.data ?? []
  const setPrimary = useSetPrimaryTeacher()
  const removeTeacher = useRemoveTeacher()
  const [poolAddOpen, setPoolAddOpen] = useState(false)

  const poolIds = new Set(teachers.map((t) => t.memberId))

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{classItem.name}</span>
            {holes > 0 && <Badge variant="destructive">дірки: {holes}</Badge>}
          </div>
          {canManage && (
            <div className="flex gap-1">
              <Button variant="ghost" size="xs" onClick={onEdit}>
                Редагувати
              </Button>
              <ConfirmDialog
                trigger={
                  <Button
                    variant="ghost"
                    size="xs"
                    className="text-destructive"
                  >
                    Видалити
                  </Button>
                }
                title={`Видалити клас «${classItem.name}»?`}
                confirmLabel="Видалити"
                destructive
                onConfirm={onDelete}
              />
            </div>
          )}
        </div>

        {classItem.description && (
          <p className="text-xs text-muted-foreground">
            {classItem.description}
          </p>
        )}

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">
              Пул ведучих · {teachers.length}{" "}
              {pluralTeachers(teachers.length)}
            </span>
            {canManage && (
              <Button
                variant="outline"
                size="xs"
                onClick={() => setPoolAddOpen(true)}
              >
                Додати
              </Button>
            )}
          </div>

          <DataState
            query={teachersQuery}
            empty={
              <p className="text-xs text-muted-foreground">Немає вчителів</p>
            }
          >
            {(list) => (
              <ul className="flex flex-col gap-1.5">
                {list.map((t) => {
                  const future = memberClassFuture(classItem.id, t.memberId)
                  return (
                    <li
                      key={t.memberId}
                      className="flex items-center justify-between gap-2 rounded-md border p-2"
                    >
                      <span className="flex flex-col">
                        <span className="flex items-center gap-1.5 text-xs">
                          {t.displayName ?? t.fullName}
                          {t.isPrimary && <Badge>основний</Badge>}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {memberQuarterLoad(t.memberId)} субот у кварталі
                        </span>
                      </span>
                      {canManage && (
                        <div className="flex gap-1">
                          {!t.isPrimary && (
                            <Button
                              variant="ghost"
                              size="xs"
                              onClick={() =>
                                setPrimary.mutate({
                                  classId: classItem.id,
                                  memberId: t.memberId,
                                  isPrimary: true,
                                })
                              }
                            >
                              Зробити основним
                            </Button>
                          )}
                          <RemovePoolButton
                            name={t.displayName ?? t.fullName}
                            future={future}
                            onConfirm={(release) =>
                              removeTeacher.mutate({
                                classId: classItem.id,
                                memberId: t.memberId,
                                releaseFutureSlots: release,
                              })
                            }
                          />
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </DataState>
        </div>
      </CardContent>

      <PoolAddDialog
        classId={classItem.id}
        poolMemberIds={poolIds}
        members={members}
        memberQuarterLoad={memberQuarterLoad}
        open={poolAddOpen}
        onOpenChange={setPoolAddOpen}
      />
    </Card>
  )
}

function RemovePoolButton({
  name,
  future,
  onConfirm,
}: {
  name: string
  future: number
  onConfirm: (releaseFutureSlots: boolean) => void
}) {
  const [release, setRelease] = useState(false)

  return (
    <ConfirmDialog
      trigger={
        <Button variant="ghost" size="xs">
          Прибрати
        </Button>
      }
      title={`Прибрати ${name} з класу?`}
      description={
        future > 0 ? (
          <span className="flex flex-col gap-3">
            <span>У цьому кварталі за ним ще {future} майбутніх субот…</span>
            <span className="flex items-center justify-between gap-2">
              <span>звільнити його майбутні слоти (стануть „вільно")</span>
              <Switch checked={release} onCheckedChange={setRelease} />
            </span>
          </span>
        ) : undefined
      }
      confirmLabel="Прибрати"
      onConfirm={() => onConfirm(future > 0 ? release : false)}
    />
  )
}

function PoolAddDialog({
  classId,
  poolMemberIds,
  members,
  memberQuarterLoad,
  open,
  onOpenChange,
}: {
  classId: string
  poolMemberIds: Set<string>
  members: Member[]
  memberQuarterLoad: (memberId: string) => number
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const addTeacher = useAddTeacher()
  const [memberId, setMemberId] = useState<string | undefined>(undefined)
  const [isPrimary, setIsPrimary] = useState(false)

  useEffect(() => {
    if (!open) {
      setMemberId(undefined)
      setIsPrimary(false)
    }
  }, [open])

  const available = members.filter((m) => !poolMemberIds.has(m.id))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Додати ведучого до пулу</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <Select value={memberId} onValueChange={setMemberId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Оберіть вчителя" />
            </SelectTrigger>
            <SelectContent>
              {available.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.displayName ?? m.fullName} ·{" "}
                  {memberQuarterLoad(m.id)} субот у кварталі
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center justify-between">
            <Label htmlFor="pool-primary">основний ведучий класу</Label>
            <Switch
              id="pool-primary"
              checked={isPrimary}
              onCheckedChange={setIsPrimary}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={!memberId || addTeacher.isPending}
            onClick={() =>
              memberId &&
              addTeacher.mutate(
                { classId, memberId, isPrimary },
                { onSuccess: () => onOpenChange(false) }
              )
            }
          >
            Додати
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
