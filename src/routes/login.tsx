import { useState } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useQueryClient } from "@tanstack/react-query"
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
import { signIn, signUp } from "@/lib/auth-client"

export const Route = createFileRoute("/login")({ component: LoginPage })

function LoginPage() {
  const [mode, setMode] = useState<"in" | "up">("in")
  const [name, setName] = useState("")
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

    const { error: authError } =
      mode === "in"
        ? await signIn.email({ email, password })
        : await signUp.email({ name, email, password })

    setPending(false)

    if (authError) {
      setError(authError.message ?? "Помилка автентифікації")
      return
    }

    qc.invalidateQueries({ queryKey: ["me"] })
    navigate({ to: "/" })
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{mode === "in" ? "Увійти" : "Реєстрація"}</CardTitle>
          <CardDescription>
            Суботня школа — панель адміністратора
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {mode === "up" && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">Ім'я</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            )}
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
              {mode === "in" ? "Увійти" : "Зареєструватися"}
            </Button>
          </form>
          <button
            type="button"
            className="mt-4 w-full text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            onClick={() => setMode((m) => (m === "in" ? "up" : "in"))}
          >
            {mode === "in"
              ? "Немає акаунта? Зареєструватися"
              : "Вже маєте акаунт? Увійти"}
          </button>
        </CardContent>
      </Card>
    </div>
  )
}
