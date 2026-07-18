export interface Member {
  id: string
  fullName: string
  displayName: string | null
  phone: string | null
  telegramUserId: number | null
  telegramUsername: string | null
  telegramLinkedAt: string | null
  userId: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Class {
  id: string
  name: string
  description: string | null
  sortOrder: number
  isActive: boolean
  createdAt: string
}

export interface TeacherPoolEntry {
  memberId: string
  fullName: string
  displayName: string | null
  isPrimary: boolean
  addedAt: string
}

export interface Quarter {
  id: string
  name: string
  startDate: string
  endDate: string
  isActive: boolean
  createdAt: string
}

export type AssignmentStatus =
  "planned" | "confirmed" | "needs_substitute" | "cancelled"

export interface Assignment {
  id: string
  classId: string
  className: string
  date: string
  memberId: string | null
  memberName: string | null
  originalMemberId: string | null
  status: AssignmentStatus
  note: string | null
}

export interface Settings {
  id: number
  telegramGroupChatId: number | null
  timezone: string
  reminderWeekday: number
  reminderHour: number
  reminderMinute: number
  pinWeekly: boolean
  undoWindowMinutes: number
  llmModel: string
  botLocale: string
  updatedAt: string
}

export interface Role {
  id: string
  key: string
  name: string
  description: string | null
}

export interface Permission {
  id: string
  key: string
  description: string | null
}

export interface Me {
  user: { id: string; email: string; name: string | null }
  member: Member | null
  permissions: string[]
}

export interface TelegramToken {
  token: string
  deepLink: string
  expiresAt: string
}

export interface ActivityChange {
  kind: "assign" | "reassign" | "swap" | "substitute" | "unassign" | "cancel"
  id: string
  assignmentId: string
  classId: string
  className: string
  date: string
  fromMemberId: string | null
  fromMemberName: string | null
  toMemberId: string | null
  toMemberName: string | null
  actorMemberId: string | null
  actorMemberName: string | null
  source: "web" | "telegram" | "system"
  swapGroupId: string | null
  undoneAt: string | null
  createdAt: string
}

export interface ActivityAnnouncement {
  kind: "weekly_reminder" | "change" | "custom"
  id: string
  targetDate: string | null
  status: "pending" | "sent" | "failed"
  changeId: string | null
  swapGroupId: string | null
  createdAt: string
}

export type ActivityItem = ActivityChange | ActivityAnnouncement

export interface CreateMemberInput {
  fullName: string
  displayName?: string
  phone?: string
  telegramUsername?: string
}

export type UpdateMemberInput = {
  fullName?: string
  displayName?: string | null
  phone?: string | null
  telegramUsername?: string | null
  isActive?: boolean
}

export interface CreateClassInput {
  name: string
  description?: string
  sortOrder?: number
}

export type UpdateClassInput = Partial<CreateClassInput> & {
  isActive?: boolean
}

export interface CreateQuarterInput {
  name: string
  startDate: string
  endDate: string
  isActive?: boolean
}

export type UpdateQuarterInput = Partial<CreateQuarterInput>

export type UpdateSettingsInput = Partial<Omit<Settings, "id" | "updatedAt">>
