import { useEffect, useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { PageHeader } from "@/components/page-header"
import { DataState } from "@/components/data-state"
import { usePerms } from "@/lib/perms"
import { useSettings, useUpdateSettings } from "@/lib/hooks"
import type { Settings, UpdateSettingsInput } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"

export const Route = createFileRoute("/_authed/settings")({
  component: SettingsPage,
})

const WEEKDAYS = ["Нд", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"]

type FormState = {
  telegramGroupChatId: string
  timezone: string
  reminderWeekday: number
  reminderHour: number
  reminderMinute: number
  pinWeekly: boolean
  undoWindowMinutes: number
  llmModel: string
  botLocale: string
}

function toForm(s: Settings): FormState {
  return {
    telegramGroupChatId: s.telegramGroupChatId?.toString() ?? "",
    timezone: s.timezone,
    reminderWeekday: s.reminderWeekday,
    reminderHour: s.reminderHour,
    reminderMinute: s.reminderMinute,
    pinWeekly: s.pinWeekly,
    undoWindowMinutes: s.undoWindowMinutes,
    llmModel: s.llmModel,
    botLocale: s.botLocale,
  }
}

function SettingsPage() {
  const { has, isLoading: permsLoading } = usePerms()
  const query = useSettings()
  const upd = useUpdateSettings()
  const [form, setForm] = useState<FormState | null>(null)

  useEffect(() => {
    if (query.data) setForm(toForm(query.data))
  }, [query.data])

  if (permsLoading) {
    return (
      <>
        <PageHeader title="Налаштування" />
        <Skeleton className="h-64 w-full" />
      </>
    )
  }

  if (!has("settings.manage")) {
    return (
      <>
        <PageHeader title="Налаштування" />
        <p className="text-sm text-muted-foreground">Немає доступу</p>
      </>
    )
  }

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  function handleSave() {
    if (!form) return
    const input: UpdateSettingsInput = {
      telegramGroupChatId: form.telegramGroupChatId.trim()
        ? Number(form.telegramGroupChatId)
        : null,
      timezone: form.timezone,
      reminderWeekday: form.reminderWeekday,
      reminderHour: form.reminderHour,
      reminderMinute: form.reminderMinute,
      pinWeekly: form.pinWeekly,
      undoWindowMinutes: form.undoWindowMinutes,
      llmModel: form.llmModel,
      botLocale: form.botLocale,
    }
    upd.mutate(input)
  }

  return (
    <>
      <PageHeader
        title="Налаштування"
        action={
          <Button onClick={handleSave} disabled={!form || upd.isPending}>
            Зберегти
          </Button>
        }
      />
      <DataState query={query}>
        {() =>
          form && (
            <div className="flex flex-col gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Нагадування</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label>День тижня</Label>
                    <Select
                      value={form.reminderWeekday.toString()}
                      onValueChange={(v) => set("reminderWeekday", Number(v))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {WEEKDAYS.map((label, i) => (
                          <SelectItem key={i} value={i.toString()}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Час</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        max={23}
                        value={form.reminderHour}
                        onChange={(e) =>
                          set("reminderHour", Number(e.target.value))
                        }
                      />
                      <span className="text-muted-foreground">:</span>
                      <Input
                        type="number"
                        min={0}
                        max={59}
                        value={form.reminderMinute}
                        onChange={(e) =>
                          set("reminderMinute", Number(e.target.value))
                        }
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="pinWeekly"
                      checked={form.pinWeekly}
                      onCheckedChange={(v) => set("pinWeekly", v)}
                    />
                    <Label htmlFor="pinWeekly">
                      Закріплювати тижневе нагадування
                    </Label>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Вікно скасування (хв)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={form.undoWindowMinutes}
                      onChange={(e) =>
                        set("undoWindowMinutes", Number(e.target.value))
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Telegram</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label>ID групового чату</Label>
                    <Input
                      type="number"
                      value={form.telegramGroupChatId}
                      onChange={(e) =>
                        set("telegramGroupChatId", e.target.value)
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Система</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label>Часовий пояс</Label>
                    <Input
                      value={form.timezone}
                      onChange={(e) => set("timezone", e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Мова бота</Label>
                    <Input
                      value={form.botLocale}
                      onChange={(e) => set("botLocale", e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <Label>Модель LLM</Label>
                    <Input
                      value={form.llmModel}
                      onChange={(e) => set("llmModel", e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      провайдер:модель, напр. openai:gpt-4o-mini-2024-07-18
                    </p>
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
