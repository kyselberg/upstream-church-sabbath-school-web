import { useEffect, useState } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useQueryClient } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { authClient, signIn } from "@/lib/auth-client"
import { apiFetch } from "@/lib/api"
import type { Me } from "@/lib/types"

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): { token?: string } => ({
    token: typeof search.token === "string" ? search.token : undefined,
  }),
  component: LoginPage,
})

function roleHomePath(me: Me) {
  const isAdmin =
    me.permissions.includes("settings.manage") ||
    me.permissions.includes("member.manage")
  return isAdmin ? "/" : "/my"
}

function LoginPage() {
  const { token } = Route.useSearch()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [verifying, setVerifying] = useState(!!token)

  useEffect(() => {
    if (!token) return
    let cancelled = false

    async function verify(magicToken: string) {
      const { error } = await authClient.magicLink.verify({
        query: { token: magicToken },
      })
      if (cancelled) return

      if (error) {
        toast.error(
          "Посилання недійсне або прострочене — напиши /login боту ще раз"
        )
        setVerifying(false)
        return
      }

      await qc.invalidateQueries({ queryKey: ["me"] })
      const me = await qc.fetchQuery({
        queryKey: ["me"],
        queryFn: () => apiFetch<Me>("/me"),
      })
      navigate({ to: roleHomePath(me), replace: true })
    }

    verify(token)
    return () => {
      cancelled = true
    }
  }, [token, qc, navigate])

  if (verifying) {
    return (
      <div className="flex min-h-svh items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        Входимо...
      </div>
    )
  }

  return <LoginForm />
}

function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const navigate = useNavigate()
  const qc = useQueryClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setPending(true)

    const { error: authError } = await signIn.email({ email, password })

    setPending(false)

    if (authError) {
      setError(authError.message ?? "Помилка автентифікації")
      return
    }

    await qc.invalidateQueries({ queryKey: ["me"] })
    const me = await qc.fetchQuery({
      queryKey: ["me"],
      queryFn: () => apiFetch<Me>("/me"),
    })
    navigate({ to: roleHomePath(me) })
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Увійти</CardTitle>
          <CardDescription>
            Суботня школа — панель адміністратора
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={pending} className="w-full">
              Увійти
            </Button>
          </form>
          <p className="mt-4 rounded-md border border-dashed p-3 text-center text-sm text-muted-foreground">
            Вчителі та адміністратори входять через Telegram: напишіть /login
            боту @SabbathSchoolUpChurchBot
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
