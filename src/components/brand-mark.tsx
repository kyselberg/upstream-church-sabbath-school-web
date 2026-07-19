import { cn } from "@/lib/utils"

export function BrandMark({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="size-[18px] rounded-md bg-primary" />
      <span className="font-semibold">Суботня школа</span>
    </div>
  )
}
