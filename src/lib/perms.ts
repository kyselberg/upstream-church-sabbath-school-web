import { useMe } from "@/lib/hooks"

export function usePerms() {
  const { data: me, isLoading, isError, error } = useMe()

  return {
    me,
    has: (key: string) => !!me?.permissions.includes(key),
    isLoading,
    isError,
    error: error ?? null,
  }
}
