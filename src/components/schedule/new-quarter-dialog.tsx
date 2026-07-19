import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useCreateQuarter, useGenerateSaturdays } from "@/lib/hooks"
import { countSaturdays } from "@/lib/utils"
import type { Quarter } from "@/lib/types"

function addDays(iso: string, days: number) {
  const d = new Date(iso)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

export function NewQuarterDialog({
  quarters,
  open,
  onOpenChange,
}: {
  quarters: Quarter[]
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const createQuarter = useCreateQuarter()
  const generateSaturdays = useGenerateSaturdays()
  const [name, setName] = useState("Новий квартал")
  const [startDate, setStartDate] = useState(todayIso())
  const [endDate, setEndDate] = useState(addDays(todayIso(), 90))
  const [generate, setGenerate] = useState(false)
  const [autoFill, setAutoFill] = useState(false)

  useEffect(() => {
    if (!open) return
    const latest = [...quarters]
      .sort((a, b) => b.endDate.localeCompare(a.endDate))
      .at(0)
    const start = latest ? addDays(latest.endDate, 1) : todayIso()
    setName("Новий квартал")
    setStartDate(start)
    setEndDate(addDays(start, 90))
    setGenerate(false)
    setAutoFill(false)
  }, [open, quarters])

  function handleCreate() {
    // ponytail: quarter creation is not wired to the undo toast this pass —
    // removal happens via delete elsewhere.
    createQuarter.mutate(
      { name, startDate, endDate },
      {
        onSuccess: (created) => {
          if (generate) {
            generateSaturdays.mutate({ id: created.id, autoFill })
          }
          onOpenChange(false)
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Новий квартал</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="quarterName">Назва</Label>
            <Input
              id="quarterName"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="quarterStart">Початок</Label>
              <Input
                id="quarterStart"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="quarterEnd">Кінець</Label>
              <Input
                id="quarterEnd"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          <p className="text-muted-foreground">
            Субот у діапазоні: {countSaturdays(startDate, endDate)}
          </p>
          <div className="flex items-center gap-2">
            <Switch
              id="genSwitch"
              checked={generate}
              onCheckedChange={setGenerate}
            />
            <Label htmlFor="genSwitch">Одразу згенерувати суботи</Label>
          </div>
          {generate && (
            <div className="ml-6 flex items-center gap-2">
              <Switch
                id="fillSwitch"
                checked={autoFill}
                onCheckedChange={setAutoFill}
              />
              <Label htmlFor="fillSwitch">
                Заповнити ведучими з пулу класу
              </Label>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Скасувати
          </Button>
          <Button disabled={createQuarter.isPending} onClick={handleCreate}>
            Створити
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
