import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        credential: { type: "text" },
      },
      async authorize(credentials) {
        const token = credentials?.credential
        if (typeof token !== "string") return null

        const { OAuth2Client } = await import("google-auth-library")
        const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!
        const client = new OAuth2Client(clientId)

        try {
          const ticket = await client.verifyIdToken({
            idToken: token,
            audience: clientId,
          })
          const payload = ticket.getPayload()
          if (!payload?.sub) return null

          return {
            id: payload.sub,
            name: payload.name ?? null,
            email: payload.email ?? null,
            image: payload.picture ?? null,
          }
        } catch {
          return null
        }
      },
    }),
  ],
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
})
