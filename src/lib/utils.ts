import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function countSaturdays(startISO: string, endISO: string): number {
  const start = new Date(startISO)
  const end = new Date(endISO)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0
  const offset = (6 - start.getUTCDay() + 7) % 7
  let count = 0
  for (
    let t = start.getTime() + offset * 86_400_000;
    t <= end.getTime();
    t += 7 * 86_400_000
  ) {
    count++
  }
  return count
}
