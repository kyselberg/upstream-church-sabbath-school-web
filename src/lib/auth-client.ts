import { createAuthClient } from "better-auth/react"
import { API_BASE } from "@/lib/api"

export const authClient = createAuthClient({
  baseURL: API_BASE,
  fetchOptions: { credentials: "include" },
})

export const { signIn, signUp, signOut } = authClient
