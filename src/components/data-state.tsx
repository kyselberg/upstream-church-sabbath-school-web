import type { ReactNode } from "react"
import type { UseQueryResult } from "@tanstack/react-query"
import { Skeleton } from "@/components/ui/skeleton"

export function DataState<T>({
  query,
  children,
  empty,
}: {
  query: UseQueryResult<T>
  children: (data: T) => ReactNode
  empty?: ReactNode
}) {
  if (query.isLoading) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    )
  }

  if (query.isError) {
    return (
      <p className="text-sm text-destructive">Помилка: {query.error.message}</p>
    )
  }

  const data = query.data as T
  if (empty && Array.isArray(data) && data.length === 0) {
    return <>{empty}</>
  }

  return <>{children(data)}</>
}
