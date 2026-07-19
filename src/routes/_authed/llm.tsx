import { useEffect, useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { PageHeader } from "@/components/page-header"
import { DataState } from "@/components/data-state"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { usePerms } from "@/lib/perms"
import { useSettings, useUpdateSettings } from "@/lib/hooks"
import type { Settings } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"

export const Route = createFileRoute("/_authed/llm")({
  component: LlmPage,
})

const PROVIDERS = [
  { value: "anthropic", label: "Anthropic" },
  { value: "openai", label: "OpenAI" },
]

type FormState = {
  llmProvider: string
  llmModel: string
  llmBaseUrl: string
}

function toForm(s: Settings): FormState {
  return {
    llmProvider: s.llmProvider,
    llmModel: s.llmModel,
    llmBaseUrl: s.llmBaseUrl ?? "",
  }
}

function LlmPage() {
  const { has, isLoading: permsLoading } = usePerms()
  const query = useSettings()
  const upd = useUpdateSettings()
  const [form, setForm] = useState<FormState | null>(null)
  const [apiKey, setApiKey] = useState("")

  useEffect(() => {
    if (query.data && !form) setForm(toForm(query.data))
  }, [query.data, form])

  if (permsLoading) {
    return (
      <>
        <PageHeader title="LLM" />
        <Skeleton className="h-64 w-full" />
      </>
    )
  }

  if (!has("settings.manage")) {
    return (
      <>
        <PageHeader title="LLM" />
        <p className="text-sm text-muted-foreground">Немає доступу</p>
      </>
    )
  }

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  function handleSave() {
    if (!form) return
    upd.mutate(
      {
        llmProvider: form.llmProvider,
        llmModel: form.llmModel,
        llmBaseUrl: form.llmBaseUrl || undefined,
        ...(apiKey.trim() ? { llmApiKey: apiKey } : {}),
      },
      { onSuccess: () => setApiKey("") }
    )
  }

  function handleClearToken() {
    upd.mutate({ llmApiKey: "" })
  }

  return (
    <>
      <PageHeader
        title="LLM"
        action={
          <Button onClick={handleSave} disabled={!form || upd.isPending}>
            Зберегти
          </Button>
        }
      />
      <DataState query={query}>
        {(data) =>
          form && (
            <div className="flex max-w-[640px] flex-col gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Модель</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div className="grid grid-cols-[180px_1fr] items-center gap-3">
                    <Label htmlFor="llmProvider">Провайдер</Label>
                    <Select
                      value={form.llmProvider}
                      onValueChange={(v) => set("llmProvider", v)}
                    >
                      <SelectTrigger id="llmProvider" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PROVIDERS.map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-[180px_1fr] items-start gap-3">
                    <Label htmlFor="llmModel" className="pt-1.5">
                      Модель
                    </Label>
                    <div className="flex flex-col gap-1">
                      <Input
                        id="llmModel"
                        value={form.llmModel}
                        onChange={(e) => set("llmModel", e.target.value)}
                      />
                      <p className="text-[11px] text-muted-foreground">
                        будь-яка назва моделі провайдера
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-[180px_1fr] items-start gap-3">
                    <Label htmlFor="llmApiKey" className="pt-1.5">
                      API-токен
                    </Label>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <Input
                          id="llmApiKey"
                          type="password"
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          placeholder={
                            data.llmApiKeySet ? "••••••••" : "не задано"
                          }
                        />
                        <ConfirmDialog
                          trigger={
                            <Button variant="ghost" size="sm">
                              Очистити токен
                            </Button>
                          }
                          title="Очистити API-токен?"
                          description="Бот повернеться до змінної оточення API_KEY."
                          confirmLabel="Очистити"
                          destructive
                          onConfirm={handleClearToken}
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {data.llmApiKeySet
                          ? "збережено — залиш порожнім, щоб не змінювати"
                          : "не задано — використовується змінна оточення бота"}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-[180px_1fr] items-start gap-3">
                    <Label htmlFor="llmBaseUrl" className="pt-1.5">
                      Base URL
                    </Label>
                    <div className="flex flex-col gap-1">
                      <Input
                        id="llmBaseUrl"
                        value={form.llmBaseUrl}
                        onChange={(e) => set("llmBaseUrl", e.target.value)}
                      />
                      <p className="text-[11px] text-muted-foreground">
                        для проксі / OpenAI-сумісних провайдерів; порожнє = стандартний
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )
        }
      </DataState>
    </>
  )
}
