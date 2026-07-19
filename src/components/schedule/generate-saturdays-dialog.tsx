import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useGenerateSaturdays } from "@/lib/hooks"
import { countSaturdays } from "@/lib/utils"
import type { Quarter } from "@/lib/types"

export function GenerateSaturdaysDialog({
  quarter,
  classesCount,
  open,
  onOpenChange,
}: {
  quarter: Quarter
  classesCount: number
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const generateSaturdays = useGenerateSaturdays()
  const [autoFill, setAutoFill] = useState(false)

  useEffect(() => {
    if (open) setAutoFill(false)
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Згенерувати суботи</DialogTitle>
        </DialogHeader>
        <p className="text-muted-foreground">
          {countSaturdays(quarter.startDate, quarter.endDate)} субот ×{" "}
          {classesCount} класів
        </p>
        <div className="flex items-center gap-2">
          <Switch
            id="fillSwitch2"
            checked={autoFill}
            onCheckedChange={setAutoFill}
          />
          <Label htmlFor="fillSwitch2">Заповнити ведучими з пулу класу</Label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Скасувати
          </Button>
          <Button
            disabled={generateSaturdays.isPending}
            onClick={() =>
              generateSaturdays.mutate(
                { id: quarter.id, autoFill },
                { onSuccess: () => onOpenChange(false) }
              )
            }
          >
            Згенерувати
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
