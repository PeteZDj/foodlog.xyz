"use client"

import { useEffect, useState } from "react"

/**
 * Pricing page.
 *
 * Prices are fetched from /api/billing/plans and never hardcoded here - the
 * server is the only place a price is written down, so the number shown is
 * always the number charged.
 */

interface Plan {
  id: string
  name: string
  price: number
  scans: number
  days: number
  tagline: string
  recommended: boolean
  price_per_scan: number
}

interface PlansResponse {
  currency: string
  free_scans: number
  payments_available: boolean
  test_mode: boolean | null
  plans: Plan[]
}

export default function PricingClient() {
  const [data, setData] = useState<PlansResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/billing/plans")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setError("Couldn't load prices. Please refresh."))
  }, [])

  const money = (n: number) => `KSh ${n.toLocaleString("en-KE")}`

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a] text-zinc-100">
      <nav className="flex items-center justify-between px-5 md:px-12 py-5 border-b border-zinc-800">
        <a href="/" className="flex items-center gap-2 font-bold text-lg tracking-tight">
          <span className="flex gap-0.5">
            <span className="w-1.5 h-4 bg-zinc-100 rounded-sm" />
            <span className="w-1.5 h-4 bg-zinc-100 rounded-sm opacity-60" />
            <span className="w-1.5 h-4 bg-zinc-100 rounded-sm opacity-30" />
          </span>
          <span>foodlog</span>
        </a>
        <a
          href="/downloads/foodlog.apk"
          className="px-4 py-2 bg-lime-400 text-zinc-900 rounded-full font-semibold text-sm hover:bg-lime-300 transition-colors"
        >
          Get the app
        </a>
      </nav>

      <main className="flex-1 px-5 md:px-12 py-12 md:py-20">
        <div className="max-w-3xl mx-auto">
          <header className="text-center mb-10">
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4 text-balance">
              Start free. Pay when it's worth it.
            </h1>
            <p className="text-zinc-400 text-base md:text-lg max-w-xl mx-auto">
              {data
                ? `Your first ${data.free_scans} photo scans are free. After that, a pass costs less than a soda.`
                : "Your first scans are free. After that, a pass costs less than a soda."}
            </p>
          </header>

          {error && (
            <p className="text-center text-red-400 text-sm mb-8">{error}</p>
          )}

          {data?.payments_available === false && (
            <div className="mb-8 p-4 rounded-xl bg-amber-400/10 border border-amber-400/30 text-center">
              <p className="text-amber-200 text-sm font-medium">
                Passes aren't on sale just yet
              </p>
              <p className="text-zinc-400 text-xs mt-1">
                Download the app and use your free scans — we'll have passes ready shortly.
              </p>
            </div>
          )}

          {data?.test_mode && (
            <p className="text-center text-amber-300 text-xs mb-6">
              Test mode — no real money will be charged.
            </p>
          )}

          {/* Passes */}
          <div className="grid gap-4 md:grid-cols-3 mb-10">
            {(data?.plans ?? []).map((plan) => (
              <div
                key={plan.id}
                className={`relative rounded-2xl border p-5 flex flex-col ${
                  plan.recommended
                    ? "border-lime-400 bg-lime-400/5"
                    : "border-zinc-800 bg-zinc-900/40"
                }`}
              >
                {plan.recommended && (
                  <span className="absolute -top-2.5 left-5 px-2 py-0.5 rounded-full bg-lime-400 text-zinc-900 text-[10px] font-bold uppercase tracking-wide">
                    Most popular
                  </span>
                )}
                <h2 className="font-semibold text-lg">{plan.name}</h2>
                <p className="text-zinc-500 text-xs mb-4">{plan.tagline}</p>

                <p className="text-3xl font-extrabold tabular-nums">
                  {money(plan.price)}
                </p>
                <p className="text-zinc-500 text-xs mb-4">
                  {plan.days === 1 ? "for 24 hours" : `for ${plan.days} days`}
                </p>

                <ul className="text-sm text-zinc-300 space-y-1.5 mb-5">
                  <li>{plan.scans} photo scans</li>
                  <li className="text-zinc-500">
                    {money(plan.price_per_scan)} per scan
                  </li>
                  <li className="text-zinc-500">Unlimited manual entries</li>
                </ul>

                <a
                  href="/downloads/foodlog.apk"
                  className={`mt-auto block text-center px-4 py-2.5 rounded-full font-semibold text-sm transition-colors ${
                    plan.recommended
                      ? "bg-lime-400 text-zinc-900 hover:bg-lime-300"
                      : "border border-zinc-700 text-zinc-200 hover:border-zinc-500"
                  }`}
                >
                  Buy in the app
                </a>
              </div>
            ))}
          </div>

          {/* Why it works this way - answering the objections people actually have */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 mb-8">
            <h2 className="font-semibold mb-4">Straight answers</h2>
            <dl className="space-y-4 text-sm">
              <div>
                <dt className="text-zinc-100 font-medium">Will it charge me every month?</dt>
                <dd className="text-zinc-400">
                  No. Nothing renews on its own. A pass runs out and you buy another
                  one when you want to — like a data bundle.
                </dd>
              </div>
              <div>
                <dt className="text-zinc-100 font-medium">Do I need a card?</dt>
                <dd className="text-zinc-400">
                  No. Pay with M-Pesa. Card and Apple Pay work too if you prefer.
                </dd>
              </div>
              <div>
                <dt className="text-zinc-100 font-medium">What if the scan gets it wrong?</dt>
                <dd className="text-zinc-400">
                  You can edit anything before it's saved. If a scan fails on our
                  side, the scan goes back to your balance automatically.
                </dd>
              </div>
              <div>
                <dt className="text-zinc-100 font-medium">Does it need a lot of data?</dt>
                <dd className="text-zinc-400">
                  One photo per scan. Typing food in by hand uses almost nothing and
                  never costs a scan.
                </dd>
              </div>
              <div>
                <dt className="text-zinc-100 font-medium">Will it work on my phone?</dt>
                <dd className="text-zinc-400">
                  It's a small Android app that runs on entry-level phones. If your
                  camera works, it works.
                </dd>
              </div>
            </dl>
          </section>

          <div className="text-center">
            <a
              href="/downloads/foodlog.apk"
              className="inline-block px-8 py-3.5 bg-lime-400 text-zinc-900 rounded-full font-bold hover:bg-lime-300 transition-colors"
            >
              Download and get {data?.free_scans ?? 5} free scans
            </a>
            <p className="text-zinc-600 text-xs mt-3">
              Android · no card needed to start
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t border-zinc-800 px-5 md:px-12 py-6 text-center text-zinc-600 text-xs">
        <a href="/" className="hover:text-zinc-400">foodlog</a>
        <span className="mx-2">·</span>
        <a href="/pricing" className="hover:text-zinc-400">Pricing</a>
      </footer>
    </div>
  )
}
