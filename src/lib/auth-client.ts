import { createAuthClient } from "better-auth/react"
import { magicLinkClient } from "better-auth/client/plugins"
import { API_BASE } from "@/lib/api"

export const authClient = createAuthClient({
  baseURL: API_BASE,
  fetchOptions: { credentials: "include" },
  plugins: [magicLinkClient()],
})

export const { signIn, signUp, signOut } = authClient
