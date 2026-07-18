import { useEffect } from "react"
import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router"
import { Loader2 } from "lucide-react"
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { usePerms } from "@/lib/perms"

export const Route = createFileRoute("/_authed")({ component: AuthedLayout })

function AuthedLayout() {
  const { isLoading, isError, error } = usePerms()
  const navigate = useNavigate()

  useEffect(() => {
    if (isError && error?.status === 401) {
      navigate({ to: "/login" })
    }
  }, [isError, error, navigate])

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (isError && error?.status === 401) {
    return null
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-12 items-center gap-2 border-b px-4">
          <SidebarTrigger />
        </header>
        <main className="p-4 md:p-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
