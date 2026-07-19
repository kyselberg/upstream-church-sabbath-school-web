import { Fragment, useMemo, useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { PageHeader } from "@/components/page-header"
import { DataState } from "@/components/data-state"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SlotDialog } from "@/components/schedule/slot-dialog"
import { FillHolesDialog } from "@/components/schedule/fill-holes-dialog"
import { BulkAssignDialog } from "@/components/schedule/bulk-assign-dialog"
import { NewQuarterDialog } from "@/components/schedule/new-quarter-dialog"
import { GenerateSaturdaysDialog } from "@/components/schedule/generate-saturdays-dialog"
import {
  useQuarters,
  useClasses,
  useMembers,
  useAssignments,
  useSettings,
} from "@/lib/hooks"
import { usePerms } from "@/lib/perms"
import { cn } from "@/lib/utils"
import type { Assignment } from "@/lib/types"

export const Route = createFileRoute("/_authed/schedule")({
  component: SchedulePage,
})

function formatDate(date: string) {
  return `${date.slice(8, 10)}.${date.slice(5, 7)}`
}

function CellBody({
  assignment,
  isFuture,
  bulkMode,
  selected,
  onToggle,
  originalName,
}: {
  assignment?: Assignment
  isFuture: boolean
  bulkMode: boolean
  selected: boolean
  onToggle: () => void
  originalName?: string
}) {
  if (!assignment) {
    return <span className="text-muted-foreground">—</span>
  }

  if (assignment.status === "cancelled") {
    return (
      <div className="flex flex-col gap-0.5">
        <span className="text-muted-foreground italic">скасовано</span>
        <Badge variant="outline">скасовано</Badge>
      </div>
    )
  }

  if (assignment.status === "needs_substitute") {
    return (
      <div className="flex flex-col gap-0.5">
        {assignment.memberName && (
          <span className="font-medium">{assignment.memberName}</span>
        )}
        <Badge variant="destructive">потрібна заміна</Badge>
      </div>
    )
  }

  if (!assignment.memberId) {
    if (!isFuture) {
      return <span className="text-muted-foreground italic">вільно</span>
    }
    return (
      <div className="flex items-center gap-2">
        {bulkMode && <Checkbox checked={selected} onCheckedChange={onToggle} />}
        <span className="text-muted-foreground italic">вільно</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-medium">{assignment.memberName}</span>
      {assignment.originalMemberId && (
        <span className="text-[10px] text-muted-foreground">
          замість {originalName ?? "—"}
        </span>
      )}
      {assignment.status === "confirmed" && (
        <Badge variant="secondary">підтверджено</Badge>
      )}
    </div>
  )
}

function SchedulePage() {
  const { has } = usePerms()
  const quartersQuery = useQuarters()
  const classesQuery = useClasses()
  const membersQuery = useMembers(true)
  const settingsQuery = useSettings()

  const [quarterId, setQuarterId] = useState<string | null>(null)
  const [bulkMode, setBulkMode] = useState(false)
  const [selectedSlotIds, setSelectedSlotIds] = useState<Set<string>>(
    new Set()
  )
  const [openSlot, setOpenSlot] = useState<Assignment | null>(null)
  const [fillOpen, setFillOpen] = useState(false)
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false)
  const [newQuarterOpen, setNewQuarterOpen] = useState(false)
  const [generateOpen, setGenerateOpen] = useState(false)

  const quarters = quartersQuery.data ?? []
  const quarter =
    quarters.find((q) => q.id === quarterId) ??
    quarters.find((q) => q.isActive) ??
    quarters.at(0)

  const assignmentsQuery = useAssignments(
    quarter ? { from: quarter.startDate, to: quarter.endDate } : {}
  )

  const classes = useMemo(
    () =>
      [...(classesQuery.data ?? [])].sort((a, b) => a.sortOrder - b.sortOrder),
    [classesQuery.data]
  )

  const members = membersQuery.data ?? []
  const memberNameById = useMemo(
    () => new Map(members.map((m) => [m.id, m.fullName])),
    [members]
  )

  const assignments = assignmentsQuery.data ?? []
  const today = new Date().toISOString().slice(0, 10)

  const dates = useMemo(() => {
    const set = new Set(assignments.map((a) => a.date))
    return [...set].sort()
  }, [assignments])

  const holesExist = assignments.some(
    (a) => !a.memberId && a.status !== "cancelled" && a.date >= today
  )

  function toggleSlot(id: string) {
    setSelectedSlotIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function exitBulk() {
    setBulkMode(false)
    setSelectedSlotIds(new Set())
  }

  if (quartersQuery.isLoading || classesQuery.isLoading) {
    return (
      <>
        <PageHeader title="Розклад" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      </>
    )
  }

  if (!quarter) {
    return (
      <>
        <PageHeader title="Розклад" />
        <Card className="items-start gap-3 p-4">
          <p className="font-medium">Немає кварталів</p>
          <p className="text-muted-foreground">
            Створи перший квартал, щоб почати планувати суботи.
          </p>
          {has("schedule.assign") && (
            <Button onClick={() => setNewQuarterOpen(true)}>
              Новий квартал
            </Button>
          )}
        </Card>
        <NewQuarterDialog
          quarters={quarters}
          open={newQuarterOpen}
          onOpenChange={setNewQuarterOpen}
        />
      </>
    )
  }

  const canAssign = has("schedule.assign")
  const canAnnounce = has("announcement.send")

  return (
    <>
      <PageHeader
        title="Розклад"
        action={
          <div className="flex items-center gap-2">
            <Select value={quarter.id} onValueChange={setQuarterId}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Оберіть квартал" />
              </SelectTrigger>
              <SelectContent>
                {quarters.map((q) => (
                  <SelectItem key={q.id} value={q.id}>
                    {q.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {canAssign && (
              <>
                <Button variant="ghost" onClick={() => setNewQuarterOpen(true)}>
                  Новий квартал
                </Button>
                {holesExist && (
                  <Button variant="outline" onClick={() => setFillOpen(true)}>
                    Заповнити дірки
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => (bulkMode ? exitBulk() : setBulkMode(true))}
                >
                  Масове призначення
                </Button>
                <Button onClick={() => setGenerateOpen(true)}>
                  Згенерувати суботи
                </Button>
              </>
            )}
          </div>
        }
      />

      <DataState query={assignmentsQuery}>
        {(data) =>
          data.length === 0 ? (
            <Card className="items-start gap-3 p-4">
              <p className="font-medium">У кварталі ще немає субот</p>
              <p className="text-muted-foreground">
                Згенеруй слоти на всі суботи кварталу — потім заповнюй сітку
              </p>
              {canAssign && (
                <Button onClick={() => setGenerateOpen(true)}>
                  Згенерувати суботи
                </Button>
              )}
            </Card>
          ) : (
            <>
              <div className="overflow-x-auto">
                <div
                  className="bg-border"
                  style={{
                    display: "grid",
                    gridTemplateColumns: `96px repeat(${classes.length}, minmax(150px,1fr))`,
                    gap: "1px",
                  }}
                >
                  <div className="bg-card p-2" />
                  {classes.map((c) => (
                    <div key={c.id} className="bg-card p-2 font-medium">
                      {c.name}
                    </div>
                  ))}

                  {dates.map((date) => {
                    const isPast = date < today
                    const isToday = date === today
                    const isFuture = date >= today
                    const rowDim = isPast ? "opacity-45 pointer-events-none" : ""

                    return (
                      <Fragment key={date}>
                        <div className={cn("bg-card p-2", rowDim)}>
                          {formatDate(date)}
                          {isToday && (
                            <span className="ml-1 rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">
                              сьогодні
                            </span>
                          )}
                        </div>
                        {classes.map((c) => {
                          const a = assignments.find(
                            (x) => x.classId === c.id && x.date === date
                          )
                          const clickable = !!a && isFuture && !bulkMode
                          const isNeedsSub = a?.status === "needs_substitute"
                          const isFreeFuture =
                            a &&
                            !a.memberId &&
                            a.status === "planned" &&
                            isFuture

                          return (
                            <div
                              key={c.id}
                              className={cn(
                                "bg-card p-2",
                                rowDim,
                                clickable &&
                                  "cursor-pointer hover:bg-foreground/[0.04]",
                                isNeedsSub && "bg-destructive/[0.06]",
                                isFreeFuture &&
                                  "outline-dashed outline-1 -outline-offset-4 outline-border"
                              )}
                              onClick={
                                clickable ? () => setOpenSlot(a) : undefined
                              }
                            >
                              <CellBody
                                assignment={a}
                                isFuture={isFuture}
                                bulkMode={bulkMode}
                                selected={a ? selectedSlotIds.has(a.id) : false}
                                onToggle={() => a && toggleSlot(a.id)}
                                originalName={
                                  a?.originalMemberId
                                    ? memberNameById.get(a.originalMemberId)
                                    : undefined
                                }
                              />
                            </div>
                          )
                        })}
                      </Fragment>
                    )
                  })}
                </div>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                дашед — вільно · червонуватий фон — потрібна заміна
              </p>
            </>
          )
        }
      </DataState>

      {bulkMode && selectedSlotIds.size > 0 && (
        <div className="sticky bottom-0 z-40 mt-2 flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-primary-foreground shadow-md">
          <span>Обрано: {selectedSlotIds.size}</span>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setBulkAssignOpen(true)}
          >
            Призначити
          </Button>
          <Button size="sm" variant="ghost" onClick={exitBulk}>
            Скасувати
          </Button>
        </div>
      )}

      {openSlot && (
        <SlotDialog
          assignment={openSlot}
          assignments={assignments}
          open={!!openSlot}
          onOpenChange={(open) => !open && setOpenSlot(null)}
          canAssign={canAssign}
          canAnnounce={canAnnounce}
          settings={settingsQuery.data}
        />
      )}

      <FillHolesDialog
        quarterId={quarter.id}
        open={fillOpen}
        onOpenChange={setFillOpen}
      />
      <BulkAssignDialog
        slotIds={[...selectedSlotIds]}
        members={members}
        open={bulkAssignOpen}
        onOpenChange={setBulkAssignOpen}
        onDone={() => {
          setBulkAssignOpen(false)
          exitBulk()
        }}
      />
      <NewQuarterDialog
        quarters={quarters}
        open={newQuarterOpen}
        onOpenChange={setNewQuarterOpen}
      />
      <GenerateSaturdaysDialog
        quarter={quarter}
        classesCount={classes.length}
        open={generateOpen}
        onOpenChange={setGenerateOpen}
      />
    </>
  )
}
