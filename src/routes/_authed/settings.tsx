import { useEffect, useMemo, useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { PageHeader } from "@/components/page-header"
import { DataState } from "@/components/data-state"
import { TelegramBubble } from "@/components/telegram-bubble"
import { usePerms } from "@/lib/perms"
import {
  useAssignments,
  useClasses,
  useCreateAnnouncement,
  useQuarters,
  useSettings,
  useUpdateSettings,
} from "@/lib/hooks"
import type { Settings, UpdateSettingsInput } from "@/lib/types"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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

const WEEKDAY_OPTIONS = [
  { value: 1, label: "Пн" },
  { value: 2, label: "Вт" },
  { value: 3, label: "Ср" },
  { value: 4, label: "Чт" },
  { value: 5, label: "Пт" },
  { value: 6, label: "Сб" },
  { value: 0, label: "Нд" },
]

const BOT_LOCALES = [
  { value: "uk", label: "Українська" },
  { value: "en", label: "English" },
]

const LLM_MODELS = ["anthropic:claude-sonnet-4-6", "anthropic:claude-opus-4-6"]

const TIMEZONES = ["Europe/Kyiv", "Europe/Warsaw", "Europe/London", "UTC"]

function withCurrent(list: string[], current: string) {
  return list.includes(current) ? list : [current, ...list]
}

function formatDayMonth(date: string) {
  return `${date.slice(8, 10)}.${date.slice(5, 7)}`
}

function nextOccurrence(weekday: number, hour: number, minute: number) {
  const now = new Date()
  const next = new Date(now)
  next.setHours(hour, minute, 0, 0)
  let days = (weekday - now.getDay() + 7) % 7
  if (days === 0 && next <= now) days = 7
  next.setDate(now.getDate() + days)
  return next
}

function formatNext(f: FormState) {
  const next = nextOccurrence(f.reminderWeekday, f.reminderHour, f.reminderMinute)
  const weekday = WEEKDAY_OPTIONS.find((w) => w.value === f.reminderWeekday)?.label
  const hh = String(f.reminderHour).padStart(2, "0")
  const mm = String(f.reminderMinute).padStart(2, "0")
  return `${weekday}, ${next.toLocaleDateString("uk-UA")}, ${hh}:${mm} (${f.timezone})`
}

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
  const quartersQuery = useQuarters()
  const classesQuery = useClasses()
  const createAnnouncement = useCreateAnnouncement()
  const [form, setForm] = useState<FormState | null>(null)

  const activeQuarter = quartersQuery.data?.find((q) => q.isActive)
  const assignmentsQuery = useAssignments(
    activeQuarter
      ? { from: activeQuarter.startDate, to: activeQuarter.endDate }
      : {}
  )

  useEffect(() => {
    if (query.data && !form) setForm(toForm(query.data))
  }, [query.data, form])

  const preview = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    const assignments = assignmentsQuery.data ?? []
    const nearestDate = assignments
      .map((a) => a.date)
      .filter((d) => d >= today)
      .sort()[0]
    if (!nearestDate) {
      return { text: "Немає запланованих субот", nearestDate: null as string | null }
    }
    const classes = [...(classesQuery.data ?? [])].sort(
      (a, b) => a.sortOrder - b.sortOrder
    )
    const lines = [
      `Нагадування · субота ${formatDayMonth(nearestDate)}`,
      ...classes.map((c) => {
        const a = assignments.find(
          (x) => x.classId === c.id && x.date === nearestDate
        )
        return `${c.name}: ${a?.memberName ?? "вільно"}`
      }),
    ]
    if (form?.pinWeekly) lines.push("📌 Закріплено")
    return { text: lines.join("\n"), nearestDate }
  }, [assignmentsQuery.data, classesQuery.data, form?.pinWeekly])

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
            <div className="flex max-w-[640px] flex-col gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Telegram</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div className="grid grid-cols-[180px_1fr] items-start gap-3">
                    <Label htmlFor="telegramGroupChatId" className="pt-1.5">
                      ID групового чату
                    </Label>
                    <div className="flex flex-col gap-1">
                      <Input
                        id="telegramGroupChatId"
                        type="number"
                        value={form.telegramGroupChatId}
                        onChange={(e) =>
                          set("telegramGroupChatId", e.target.value)
                        }
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Без ID чату оголошення в групу не працюють
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-[180px_1fr] items-center gap-3">
                    <Label htmlFor="botLocale">Мова бота</Label>
                    <Select
                      value={form.botLocale}
                      onValueChange={(v) => set("botLocale", v)}
                    >
                      <SelectTrigger id="botLocale" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BOT_LOCALES.map((l) => (
                          <SelectItem key={l.value} value={l.value}>
                            {l.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-[180px_1fr] items-center gap-3">
                    <Label htmlFor="llmModel">LLM-модель</Label>
                    <Select
                      value={form.llmModel}
                      onValueChange={(v) => set("llmModel", v)}
                    >
                      <SelectTrigger id="llmModel" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {withCurrent(LLM_MODELS, form.llmModel).map((m) => (
                          <SelectItem key={m} value={m}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Тижневе нагадування</CardTitle>
                  <CardDescription>Наступне: {formatNext(form)}</CardDescription>
                  <CardAction>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={
                        !form.telegramGroupChatId ||
                        !preview.nearestDate ||
                        createAnnouncement.isPending
                      }
                      onClick={() =>
                        createAnnouncement.mutate({ text: preview.text })
                      }
                    >
                      Надіслати зараз
                    </Button>
                  </CardAction>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div className="grid grid-cols-[180px_1fr] items-center gap-3">
                    <Label htmlFor="reminderWeekday">День тижня</Label>
                    <Select
                      value={form.reminderWeekday.toString()}
                      onValueChange={(v) => set("reminderWeekday", Number(v))}
                    >
                      <SelectTrigger id="reminderWeekday" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {WEEKDAY_OPTIONS.map((w) => (
                          <SelectItem key={w.value} value={w.value.toString()}>
                            {w.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-[180px_1fr] items-center gap-3">
                    <Label>Час</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        aria-label="Година"
                        type="number"
                        className="w-16"
                        min={0}
                        max={23}
                        value={form.reminderHour}
                        onChange={(e) =>
                          set("reminderHour", Number(e.target.value))
                        }
                      />
                      <span className="text-muted-foreground">:</span>
                      <Input
                        aria-label="Хвилина"
                        type="number"
                        className="w-16"
                        min={0}
                        max={59}
                        value={form.reminderMinute}
                        onChange={(e) =>
                          set("reminderMinute", Number(e.target.value))
                        }
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-[180px_1fr] items-center gap-3">
                    <Label htmlFor="timezone">Часовий пояс</Label>
                    <Select
                      value={form.timezone}
                      onValueChange={(v) => set("timezone", v)}
                    >
                      <SelectTrigger id="timezone" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {withCurrent(TIMEZONES, form.timezone).map((tz) => (
                          <SelectItem key={tz} value={tz}>
                            {tz}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-[180px_1fr] items-center gap-3">
                    <Label htmlFor="pinWeekly">Закріпляти в групі</Label>
                    <Switch
                      id="pinWeekly"
                      checked={form.pinWeekly}
                      onCheckedChange={(v) => set("pinWeekly", v)}
                    />
                  </div>
                  <div className="grid grid-cols-[180px_1fr] items-center gap-3">
                    <Label htmlFor="undoWindowMinutes">
                      Вікно скасування (хв)
                    </Label>
                    <Input
                      id="undoWindowMinutes"
                      type="number"
                      min={0}
                      value={form.undoWindowMinutes}
                      onChange={(e) =>
                        set("undoWindowMinutes", Number(e.target.value))
                      }
                    />
                  </div>
                  <div className="grid grid-cols-[180px_1fr] items-start gap-3">
                    <Label className="pt-1.5">Попередній перегляд</Label>
                    <TelegramBubble>
                      <p className="whitespace-pre-line">{preview.text}</p>
                    </TelegramBubble>
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
