import { auth, signOut } from "@/auth"
import { redirect } from "next/navigation"

export const metadata = {
  title: "My Log — Foodlog",
}

export default async function LogPage() {
  const session = await auth()
  if (!session) redirect("/login?callbackUrl=/log")

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a] text-zinc-100">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 md:px-12 py-5 border-b border-zinc-800">
        <a href="/" className="flex items-center gap-2 font-bold text-lg tracking-tight">
          <span className="flex gap-0.5">
            <span className="w-1.5 h-4 bg-zinc-100 rounded-sm" />
            <span className="w-1.5 h-4 bg-zinc-100 rounded-sm opacity-60" />
            <span className="w-1.5 h-4 bg-zinc-100 rounded-sm opacity-30" />
          </span>
          <span>foodlog</span>
        </a>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-zinc-500">
            {session.user?.name ?? session.user?.email}
          </span>
          <form
            action={async () => {
              "use server"
              await signOut({ redirectTo: "/" })
            }}
          >
            <button
              type="submit"
              className="px-4 py-2 rounded-full border border-zinc-700 text-zinc-400 hover:text-zinc-100 hover:border-zinc-500 transition-colors text-xs"
            >
              Sign out
            </button>
          </form>
        </div>
      </nav>

      {/* Main */}
      <main className="flex-1 px-6 md:px-12 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <p className="font-mono text-xs text-zinc-500 tracking-widest uppercase mb-2">
              Your food log
            </p>
            <h1 className="text-3xl font-bold">
              Welcome back{session.user?.name ? `, ${session.user.name.split(" ")[0]}` : ""}.
            </h1>
          </div>

          {/* Placeholder — food logging UI goes here */}
          <div className="border border-zinc-800 rounded-2xl p-8 text-center">
            <p className="text-zinc-500 mb-4">
              Your food log is being built.
            </p>
            <p className="text-sm text-zinc-600">
              Sign in is working — your account is linked and logs will sync here
              once the logging interface is ready.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
