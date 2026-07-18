import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { apiFetch, ApiError } from "@/lib/api"
import type {
  Member,
  CreateMemberInput,
  UpdateMemberInput,
  TelegramToken,
  Class,
  CreateClassInput,
  UpdateClassInput,
  TeacherPoolEntry,
  Quarter,
  CreateQuarterInput,
  UpdateQuarterInput,
  Assignment,
  Settings,
  UpdateSettingsInput,
  Role,
  Permission,
  ActivityItem,
  Me,
} from "@/lib/types"

function onError(err: ApiError) {
  toast.error(err.message)
}

export function useMe() {
  return useQuery<Me, ApiError>({
    queryKey: ["me"],
    queryFn: () => apiFetch<Me>("/me"),
    retry: false,
    staleTime: 30_000,
  })
}

export function useMembers(activeOnly?: boolean) {
  return useQuery<Member[], ApiError>({
    queryKey: ["members", { activeOnly }],
    queryFn: () =>
      apiFetch<Member[]>("/members", {
        params: activeOnly ? { active: true } : undefined,
      }),
  })
}

export function useCreateMember() {
  const qc = useQueryClient()
  return useMutation<Member, ApiError, CreateMemberInput>({
    mutationFn: (input) =>
      apiFetch<Member>("/members", { method: "POST", body: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["members"] })
      toast.success("Вчителя додано")
    },
    onError,
  })
}

export function useUpdateMember() {
  const qc = useQueryClient()
  return useMutation<Member, ApiError, { id: string } & UpdateMemberInput>({
    mutationFn: ({ id, ...input }) =>
      apiFetch<Member>(`/members/${id}`, { method: "PATCH", body: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["members"] })
      toast.success("Вчителя оновлено")
    },
    onError,
  })
}

export function useDeleteMember() {
  const qc = useQueryClient()
  return useMutation<Member, ApiError, string>({
    mutationFn: (id) =>
      apiFetch<Member>(`/members/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["members"] })
      toast.success("Вчителя видалено")
    },
    onError,
  })
}

export function useCreateTelegramToken() {
  return useMutation<TelegramToken, ApiError, string>({
    mutationFn: (id) =>
      apiFetch<TelegramToken>(`/members/${id}/telegram-token`, {
        method: "POST",
      }),
    onSuccess: () => toast.success("Токен створено"),
    onError,
  })
}

export function useClasses() {
  return useQuery<Class[], ApiError>({
    queryKey: ["classes"],
    queryFn: () => apiFetch<Class[]>("/classes"),
  })
}

export function useCreateClass() {
  const qc = useQueryClient()
  return useMutation<Class, ApiError, CreateClassInput>({
    mutationFn: (input) =>
      apiFetch<Class>("/classes", { method: "POST", body: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["classes"] })
      toast.success("Клас додано")
    },
    onError,
  })
}

export function useUpdateClass() {
  const qc = useQueryClient()
  return useMutation<Class, ApiError, { id: string } & UpdateClassInput>({
    mutationFn: ({ id, ...input }) =>
      apiFetch<Class>(`/classes/${id}`, { method: "PATCH", body: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["classes"] })
      toast.success("Клас оновлено")
    },
    onError,
  })
}

export function useDeleteClass() {
  const qc = useQueryClient()
  return useMutation<Class, ApiError, string>({
    mutationFn: (id) => apiFetch<Class>(`/classes/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["classes"] })
      toast.success("Клас видалено")
    },
    onError,
  })
}

export function useClassTeachers(classId?: string) {
  return useQuery<TeacherPoolEntry[], ApiError>({
    queryKey: ["class-teachers", classId],
    queryFn: () => apiFetch<TeacherPoolEntry[]>(`/classes/${classId}/teachers`),
    enabled: !!classId,
  })
}

export function useAddTeacher() {
  const qc = useQueryClient()
  return useMutation<
    TeacherPoolEntry,
    ApiError,
    { classId: string; memberId: string; isPrimary?: boolean }
  >({
    mutationFn: ({ classId, ...input }) =>
      apiFetch<TeacherPoolEntry>(`/classes/${classId}/teachers`, {
        method: "POST",
        body: input,
      }),
    onSuccess: (_data, { classId }) => {
      qc.invalidateQueries({ queryKey: ["class-teachers", classId] })
      toast.success("Вчителя додано до класу")
    },
    onError,
  })
}

export function useRemoveTeacher() {
  const qc = useQueryClient()
  return useMutation<unknown, ApiError, { classId: string; memberId: string }>({
    mutationFn: ({ classId, memberId }) =>
      apiFetch(`/classes/${classId}/teachers/${memberId}`, {
        method: "DELETE",
      }),
    onSuccess: (_data, { classId }) => {
      qc.invalidateQueries({ queryKey: ["class-teachers", classId] })
      toast.success("Вчителя видалено з класу")
    },
    onError,
  })
}

export function useQuarters() {
  return useQuery<Quarter[], ApiError>({
    queryKey: ["quarters"],
    queryFn: () => apiFetch<Quarter[]>("/quarters"),
  })
}

export function useCreateQuarter() {
  const qc = useQueryClient()
  return useMutation<Quarter, ApiError, CreateQuarterInput>({
    mutationFn: (input) =>
      apiFetch<Quarter>("/quarters", { method: "POST", body: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quarters"] })
      toast.success("Квартал додано")
    },
    onError,
  })
}

export function useUpdateQuarter() {
  const qc = useQueryClient()
  return useMutation<Quarter, ApiError, { id: string } & UpdateQuarterInput>({
    mutationFn: ({ id, ...input }) =>
      apiFetch<Quarter>(`/quarters/${id}`, { method: "PATCH", body: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quarters"] })
      toast.success("Квартал оновлено")
    },
    onError,
  })
}

export function useDeleteQuarter() {
  const qc = useQueryClient()
  return useMutation<Quarter, ApiError, string>({
    mutationFn: (id) =>
      apiFetch<Quarter>(`/quarters/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quarters"] })
      toast.success("Квартал видалено")
    },
    onError,
  })
}

export function useGenerateSaturdays() {
  const qc = useQueryClient()
  return useMutation<
    { saturdays: string[]; created: number },
    ApiError,
    string
  >({
    mutationFn: (id) =>
      apiFetch<{ saturdays: string[]; created: number }>(
        `/quarters/${id}/generate-saturdays`,
        {
          method: "POST",
        }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assignments"] })
      toast.success("Суботи згенеровано")
    },
    onError,
  })
}

export function useAssignments(params: {
  from?: string
  to?: string
  classId?: string
}) {
  return useQuery<Assignment[], ApiError>({
    queryKey: ["assignments", params],
    queryFn: () =>
      apiFetch<Assignment[]>("/assignments", {
        params: { from: params.from, to: params.to, classId: params.classId },
      }),
  })
}

export function useReassign() {
  const qc = useQueryClient()
  return useMutation<Assignment, ApiError, { id: string; toMemberId: string }>({
    mutationFn: ({ id, toMemberId }) =>
      apiFetch<Assignment>(`/assignments/${id}`, {
        method: "PATCH",
        body: { toMemberId },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assignments"] })
      qc.invalidateQueries({ queryKey: ["activity"] })
      toast.success("Призначення оновлено")
    },
    onError,
  })
}

export function useSubstitute() {
  const qc = useQueryClient()
  return useMutation<
    Assignment,
    ApiError,
    { id: string; substituteMemberId: string }
  >({
    mutationFn: ({ id, substituteMemberId }) =>
      apiFetch<Assignment>(`/assignments/${id}/substitute`, {
        method: "POST",
        body: { substituteMemberId },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assignments"] })
      qc.invalidateQueries({ queryKey: ["activity"] })
      toast.success("Заміну призначено")
    },
    onError,
  })
}

export function useMarkUnavailable() {
  const qc = useQueryClient()
  return useMutation<Assignment, ApiError, { id: string }>({
    mutationFn: ({ id }) =>
      apiFetch<Assignment>(`/assignments/${id}/mark-unavailable`, {
        method: "POST",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assignments"] })
      qc.invalidateQueries({ queryKey: ["activity"] })
      toast.success("Позначено недоступність")
    },
    onError,
  })
}

export function useSwap() {
  const qc = useQueryClient()
  return useMutation<unknown, ApiError, { aId: string; bId: string }>({
    mutationFn: (input) => apiFetch("/swaps", { method: "POST", body: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assignments"] })
      qc.invalidateQueries({ queryKey: ["activity"] })
      toast.success("Обмін виконано")
    },
    onError,
  })
}

export function useUndo() {
  const qc = useQueryClient()
  return useMutation<
    { ok: boolean; message: string },
    ApiError,
    { ref: string }
  >({
    mutationFn: (input) =>
      apiFetch<{ ok: boolean; message: string }>("/undo", {
        method: "POST",
        body: input,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assignments"] })
      qc.invalidateQueries({ queryKey: ["activity"] })
      toast.success("Скасовано")
    },
    onError,
  })
}

export function useAnnounce() {
  const qc = useQueryClient()
  return useMutation<
    { ok: boolean; messageId: string },
    ApiError,
    { id: string; changeId?: string }
  >({
    mutationFn: ({ id, changeId }) =>
      apiFetch<{ ok: boolean; messageId: string }>(
        `/assignments/${id}/announce`,
        {
          method: "POST",
          body: { changeId },
        }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["activity"] })
      toast.success("Оголошення надіслано")
    },
    onError,
  })
}

export function useActivity(params: { from?: string; to?: string }) {
  return useQuery<ActivityItem[], ApiError>({
    queryKey: ["activity", params],
    queryFn: () => apiFetch<ActivityItem[]>("/activity", { params }),
  })
}

export function useSettings() {
  return useQuery<Settings, ApiError>({
    queryKey: ["settings"],
    queryFn: () => apiFetch<Settings>("/settings"),
  })
}

export function useUpdateSettings() {
  const qc = useQueryClient()
  return useMutation<Settings, ApiError, UpdateSettingsInput>({
    mutationFn: (input) =>
      apiFetch<Settings>("/settings", { method: "PATCH", body: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings"] })
      toast.success("Налаштування збережено")
    },
    onError,
  })
}

export function useRoles() {
  return useQuery<Role[], ApiError>({
    queryKey: ["roles"],
    queryFn: () => apiFetch<Role[]>("/roles"),
  })
}

export function usePermissions() {
  return useQuery<Permission[], ApiError>({
    queryKey: ["permissions"],
    queryFn: () => apiFetch<Permission[]>("/permissions"),
  })
}

export function useMemberRoles(memberId?: string) {
  return useQuery<Role[], ApiError>({
    queryKey: ["member-roles", memberId],
    queryFn: () => apiFetch<Role[]>(`/members/${memberId}/roles`),
    enabled: !!memberId,
  })
}

export function useGrantRole() {
  const qc = useQueryClient()
  return useMutation<
    Role[],
    ApiError,
    { memberId: string; roleId?: string; roleKey?: string }
  >({
    mutationFn: ({ memberId, ...input }) =>
      apiFetch<Role[]>(`/members/${memberId}/roles`, {
        method: "POST",
        body: input,
      }),
    onSuccess: (_data, { memberId }) => {
      qc.invalidateQueries({ queryKey: ["member-roles", memberId] })
      toast.success("Роль надано")
    },
    onError,
  })
}

export function useRevokeRole() {
  const qc = useQueryClient()
  return useMutation<unknown, ApiError, { memberId: string; roleId: string }>({
    mutationFn: ({ memberId, roleId }) =>
      apiFetch(`/members/${memberId}/roles/${roleId}`, { method: "DELETE" }),
    onSuccess: (_data, { memberId }) => {
      qc.invalidateQueries({ queryKey: ["member-roles", memberId] })
      toast.success("Роль відкликано")
    },
    onError,
  })
}
