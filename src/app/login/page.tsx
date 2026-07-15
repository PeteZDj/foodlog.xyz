import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { GoogleButton } from "./GoogleButton"

export const metadata = {
  title: "Sign in — Foodlog",
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>
}) {
  const session = await auth()
  if (session) redirect("/log")

  const params = await searchParams
  const callbackUrl = params?.callbackUrl ?? "/log"
  const error = params?.error

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0a] px-4">
      {/* Logo */}
      <a href="/" className="flex items-center gap-2 font-bold text-lg tracking-tight mb-12 text-zinc-100">
        <span className="flex gap-0.5">
          <span className="w-1.5 h-4 bg-zinc-100 rounded-sm" />
          <span className="w-1.5 h-4 bg-zinc-100 rounded-sm opacity-60" />
          <span className="w-1.5 h-4 bg-zinc-100 rounded-sm opacity-30" />
        </span>
        <span>foodlog</span>
      </a>

      <div className="w-full max-w-sm">
        <div className="border border-zinc-800 rounded-2xl p-8 bg-zinc-900/50">
          <h1 className="text-2xl font-bold text-zinc-100 mb-2 text-center">Sign in</h1>
          <p className="text-sm text-zinc-500 text-center mb-8">
            Your log syncs to your account — access it from any device.
          </p>

          {error && (
            <div className="mb-6 px-4 py-3 rounded-lg bg-red-950/60 border border-red-800 text-red-300 text-sm text-center">
              {error === "CredentialsSignin"
                ? "Google sign-in failed. Please try again."
                : "Sign-in failed. Please try again."}
            </div>
          )}

          <GoogleButton callbackUrl={callbackUrl} />

          <p className="mt-6 text-xs text-zinc-600 text-center leading-relaxed">
            By signing in you agree to our{" "}
            <a href="#" className="text-zinc-500 hover:text-zinc-300 underline underline-offset-2 transition-colors">
              terms
            </a>{" "}
            and{" "}
            <a href="#" className="text-zinc-500 hover:text-zinc-300 underline underline-offset-2 transition-colors">
              privacy policy
            </a>
            .
          </p>
        </div>
      </div>
    </main>
  )
}
