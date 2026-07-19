import { Link, useNavigate, useRouterState } from "@tanstack/react-router"
import {
  LayoutDashboard,
  CalendarDays,
  BookOpen,
  Users,
  Shield,
  ScrollText,
  Settings,
  Bot,
  LogOut,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { usePerms } from "@/lib/perms"
import { signOut } from "@/lib/auth-client"
import { useQueryClient } from "@tanstack/react-query"

const NAV_ITEMS = [
  { label: "Панель", path: "/", perm: "schedule.read", icon: LayoutDashboard },
  {
    label: "Розклад",
    path: "/schedule",
    perm: "schedule.read",
    icon: CalendarDays,
  },
  { label: "Класи", path: "/classes", perm: "class.read", icon: BookOpen },
  { label: "Вчителі", path: "/members", perm: "member.read", icon: Users },
  { label: "Ролі", path: "/roles", perm: "role.manage", icon: Shield },
  {
    label: "Журнал",
    path: "/activity",
    perm: "schedule.read",
    icon: ScrollText,
  },
  {
    label: "Налаштування",
    path: "/settings",
    perm: "settings.manage",
    icon: Settings,
  },
  { label: "LLM", path: "/llm", perm: "settings.manage", icon: Bot },
] as const

export function AppSidebar() {
  const { has, me } = usePerms()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  async function handleLogout() {
    await signOut()
    qc.invalidateQueries({ queryKey: ["me"] })
    navigate({ to: "/login" })
  }

  return (
    <Sidebar>
      <SidebarHeader className="px-3 py-2 text-sm font-semibold">
        Суботня школа
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {NAV_ITEMS.filter((item) => has(item.perm)).map((item) => (
            <SidebarMenuItem key={item.path}>
              <SidebarMenuButton asChild isActive={pathname === item.path}>
                <Link to={item.path}>
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton>
                  <span className="truncate">
                    {me?.user.name ?? me?.user.email}
                  </span>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-56">
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut />
                  Вийти
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
