import { useMemo, useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { MoreHorizontal } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { DataState } from "@/components/data-state"
import { MemberCombobox } from "@/components/member-combobox"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  useQuarters,
  useClasses,
  useMembers,
  useAssignments,
  useClassTeachers,
  useReassign,
  useSubstitute,
  useMarkUnavailable,
  useAnnounce,
  useGenerateSaturdays,
} from "@/lib/hooks"
import { usePerms } from "@/lib/perms"
import type { Assignment, Member } from "@/lib/types"

export const Route = createFileRoute("/_authed/schedule")({
  component: SchedulePage,
})

const STATUS_LABEL: Record<string, string> = {
  needs_substitute: "Потрібна заміна",
  cancelled: "Скасовано",
}

function formatDate(date: string) {
  return `${date.slice(8, 10)}.${date.slice(5, 7)}`
}

function SchedulePage() {
  const { has } = usePerms()
  const quartersQuery = useQuarters()
  const classesQuery = useClasses()
  const membersQuery = useMembers(true)
  const generateSaturdays = useGenerateSaturdays()
  const [quarterId, setQuarterId] = useState<string | null>(null)

  const quarters = quartersQuery.data ?? []
  const quarter =
    quarters.find((q) => q.id === quarterId) ??
    quarters.find((q) => q.isActive) ??
    quarters[0]

  const assignmentsQuery = useAssignments(
    quarter ? { from: quarter.startDate, to: quarter.endDate } : {}
  )

  const classes = useMemo(
    () =>
      [...(classesQuery.data ?? [])].sort((a, b) => a.sortOrder - b.sortOrder),
    [classesQuery.data]
  )

  const dates = useMemo(() => {
    const set = new Set((assignmentsQuery.data ?? []).map((a) => a.date))
    return [...set].sort()
  }, [assignmentsQuery.data])

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
        <p className="text-sm text-muted-foreground">Немає кварталів</p>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Розклад"
        action={
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
        }
      />

      <DataState query={assignmentsQuery}>
        {(assignments) =>
          assignments.length === 0 ? (
            <div className="flex flex-col items-start gap-3">
              <p className="text-sm text-muted-foreground">
                Немає призначень на цей квартал
              </p>
              {has("schedule.assign") && (
                <Button
                  onClick={() => generateSaturdays.mutate(quarter.id)}
                  disabled={generateSaturdays.isPending}
                >
                  Згенерувати суботи
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Дата</TableHead>
                    {classes.map((c) => (
                      <TableHead key={c.id}>{c.name}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dates.map((date) => (
                    <TableRow key={date}>
                      <TableCell className="font-medium">
                        {formatDate(date)}
                      </TableCell>
                      {classes.map((c) => {
                        const a = assignments.find(
                          (x) => x.classId === c.id && x.date === date
                        )
                        return (
                          <TableCell key={c.id}>
                            {a ? (
                              <AssignmentCell
                                assignment={a}
                                classId={c.id}
                                fallbackMembers={membersQuery.data ?? []}
                              />
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        )
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )
        }
      </DataState>
    </>
  )
}

function AssignmentCell({
  assignment,
  classId,
  fallbackMembers,
}: {
  assignment: Assignment
  classId: string
  fallbackMembers: Member[]
}) {
  const { has } = usePerms()
  const teachersQuery = useClassTeachers(classId)
  const reassign = useReassign()
  const substitute = useSubstitute()
  const markUnavailable = useMarkUnavailable()
  const announce = useAnnounce()

  const [dialogKind, setDialogKind] = useState<
    "reassign" | "substitute" | null
  >(null)
  const [pickedId, setPickedId] = useState<string | null>(null)

  const pool = teachersQuery.data?.length ? teachersQuery.data : fallbackMembers
  const canAssign = has("schedule.assign.own")
  const canAnnounce = has("announcement.send")
  const isBusy = reassign.isPending || substitute.isPending

  function openDialog(kind: "reassign" | "substitute") {
    setPickedId(kind === "reassign" ? assignment.memberId : null)
    setDialogKind(kind)
  }

  function confirm() {
    if (!pickedId) return
    if (dialogKind === "reassign") {
      reassign.mutate({ id: assignment.id, toMemberId: pickedId })
    } else {
      substitute.mutate({ id: assignment.id, substituteMemberId: pickedId })
    }
    setDialogKind(null)
  }

  return (
    <div className="flex items-center gap-1">
      <div className="flex flex-col gap-0.5">
        <span>
          {assignment.memberName ?? (
            <span className="text-muted-foreground">—</span>
          )}
        </span>
        {assignment.status !== "planned" &&
          assignment.status !== "confirmed" && (
            <Badge
              variant={
                assignment.status === "needs_substitute"
                  ? "destructive"
                  : "outline"
              }
            >
              {STATUS_LABEL[assignment.status] ?? assignment.status}
            </Badge>
          )}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" className="ml-auto shrink-0">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            disabled={!canAssign}
            onClick={() => openDialog("reassign")}
          >
            Призначити / Змінити
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!canAssign}
            onClick={() => openDialog("substitute")}
          >
            Заміна
          </DropdownMenuItem>
          <ConfirmDialog
            trigger={
              <DropdownMenuItem
                disabled={!canAssign}
                onSelect={(e) => e.preventDefault()}
              >
                Позначити недоступним
              </DropdownMenuItem>
            }
            title="Позначити недоступним?"
            description={`${assignment.className}, ${formatDate(assignment.date)}`}
            onConfirm={() => markUnavailable.mutate({ id: assignment.id })}
            destructive
          />
          <DropdownMenuItem
            disabled={!canAnnounce}
            onClick={() => announce.mutate({ id: assignment.id })}
          >
            Оголосити зміну
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={dialogKind !== null}
        onOpenChange={(open) => !open && setDialogKind(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogKind === "reassign" ? "Призначити / Змінити" : "Заміна"}
            </DialogTitle>
          </DialogHeader>
          <MemberCombobox
            members={pool}
            value={pickedId}
            onChange={setPickedId}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogKind(null)}>
              Скасувати
            </Button>
            <Button onClick={confirm} disabled={!pickedId || isBusy}>
              Зберегти
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
