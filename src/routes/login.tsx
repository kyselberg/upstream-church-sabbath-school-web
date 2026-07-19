import { useEffect, useState } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useQueryClient } from "@tanstack/react-query"
import { Check, Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { BrandMark } from "@/components/brand-mark"
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

function roleLabel(me: Me) {
  if (me.permissions.includes("settings.manage")) return "суперадмін"
  if (me.permissions.includes("member.manage")) return "адмін"
  return "вчитель"
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("")
}

type View = "checking" | "ok" | "expired" | "form"

function LoginPage() {
  const { token } = Route.useSearch()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [view, setView] = useState<View>(token ? "checking" : "form")
  const [me, setMe] = useState<Me | null>(null)

  useEffect(() => {
    if (!token) return
    let cancelled = false

    async function verify(magicToken: string) {
      const { error } = await authClient.magicLink.verify({
        query: { token: magicToken },
      })
      if (cancelled) return

      if (error) {
        setView("expired")
        return
      }

      await qc.invalidateQueries({ queryKey: ["me"] })
      const freshMe = await qc.fetchQuery({
        queryKey: ["me"],
        queryFn: () => apiFetch<Me>("/me"),
      })
      if (cancelled) return
      setMe(freshMe)
      setView("ok")
    }

    verify(token)
    return () => {
      cancelled = true
    }
  }, [token, qc])

  function showPasswordForm() {
    navigate({ to: "/login", replace: true })
    setView("form")
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted p-4">
      <Card className="w-[360px] max-w-full">
        <CardContent className="flex flex-col items-center gap-4">
          <BrandMark />
          {view === "checking" && <CheckingView />}
          {view === "ok" && me && (
            <OkView me={me} onCancel={showPasswordForm} />
          )}
          {view === "expired" && <ExpiredView onPassword={showPasswordForm} />}
          {view === "form" && <PasswordForm />}
        </CardContent>
      </Card>
    </div>
  )
}

function CheckingView() {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <p className="font-heading text-sm font-medium">
        Перевіряємо посилання…
      </p>
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
      <p className="text-xs text-muted-foreground">
        Вхід через Telegram · зазвичай це секунда-дві
      </p>
    </div>
  )
}

function OkView({ me, onCancel }: { me: Me; onCancel: () => void }) {
  const navigate = useNavigate()
  const [seconds, setSeconds] = useState(5)

  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s - 1), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (seconds <= 0) navigate({ to: roleHomePath(me), replace: true })
  }, [seconds, me, navigate])

  const fullName = me.member?.fullName ?? me.user.name ?? "?"

  return (
    <div className="flex w-full flex-col items-center gap-4 text-center">
      <div className="grid size-10 place-items-center rounded-full bg-primary text-primary-foreground">
        <Check className="size-5" />
      </div>
      <p className="font-heading text-sm font-medium">Посилання дійсне</p>
      <div className="flex w-full items-center gap-3 rounded-[10px] bg-muted p-3 text-left">
        <div className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/20 text-xs font-semibold">
          {initials(fullName)}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{fullName}</p>
          <p className="truncate text-xs text-muted-foreground">
            {me.member?.telegramUsername ? `@${me.member.telegramUsername} · ` : ""}
            {roleLabel(me)}
          </p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Перенаправимо автоматично через {seconds} с
      </p>
      <div className="flex w-full flex-col gap-2">
        <Button
          className="w-full"
          onClick={() => navigate({ to: roleHomePath(me), replace: true })}
        >
          Увійти зараз
        </Button>
        <Button variant="ghost" className="w-full" onClick={onCancel}>
          Це не я — скасувати
        </Button>
      </div>
    </div>
  )
}

function ExpiredView({ onPassword }: { onPassword: () => void }) {
  return (
    <div className="flex w-full flex-col items-center gap-4 text-center">
      <div className="grid size-10 place-items-center rounded-full bg-destructive/10 text-destructive">
        <X className="size-5" />
      </div>
      <p className="font-heading text-sm font-medium">Посилання не діє</p>
      <p className="text-xs text-muted-foreground">
        Одноразове і живе кілька хвилин · попроси в бота нове — напиши /login
      </p>
      <div className="flex w-full flex-col gap-2">
        {/* ponytail: no backend path exists to resend a consumed/expired token (better-auth invalidates it) — this is instructional-only, points back to the bot instead of a resend mutation */}
        <Button asChild className="w-full">
          <a
            href="https://t.me/SabbathSchoolUpChurchBot"
            target="_blank"
            rel="noopener noreferrer"
          >
            Відкрити бота
          </a>
        </Button>
        <Button variant="ghost" className="w-full" onClick={onPassword}>
          Увійти паролем
        </Button>
      </div>
    </div>
  )
}

function PasswordForm() {
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
    <div className="flex w-full flex-col gap-4">
      <div className="text-center">
        <p className="font-heading text-sm font-medium">Вхід</p>
        <p className="text-xs text-muted-foreground">
          Доступні дії визначає твоя роль
        </p>
      </div>
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
      <p className="rounded-md border border-dashed p-3 text-center text-sm text-muted-foreground">
        Вчителі та адміністратори входять через Telegram: напишіть /login
        боту @SabbathSchoolUpChurchBot
      </p>
    </div>
  )
}
