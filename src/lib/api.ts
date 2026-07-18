export const API_BASE =
  import.meta.env.VITE_API_BASE_URL ??
  "https://upstream-church-sabbath-school-api-production.up.railway.app"

export class ApiError extends Error {
  status: number
  code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.code = code
  }
}

type ApiFetchOpts = {
  method?: string
  body?: unknown
  params?: Record<string, string | number | boolean | undefined>
}

function buildUrl(path: string, params?: ApiFetchOpts["params"]) {
  const url = new URL(API_BASE + path)
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) url.searchParams.set(key, String(value))
    }
  }
  return url.toString()
}

export async function apiFetch<T>(
  path: string,
  opts: ApiFetchOpts = {}
): Promise<T> {
  const { method = "GET", body, params } = opts

  const res = await fetch(buildUrl(path, params), {
    method,
    credentials: "include",
    headers:
      body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    let code = "unknown"
    let message = res.statusText
    try {
      const json = await res.json()
      const err = json.error ?? json
      code = err.code ?? code
      message = err.message ?? message
    } catch {
      // no json body
    }
    throw new ApiError(res.status, code, message)
  }

  if (res.status === 204) return undefined as T
  return res.json()
}
