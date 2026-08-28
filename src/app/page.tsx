export const metadata = {
  title: "Foodlog — snap your plate, see the calories",
  description:
    "Take a photo of your food and know what's in it. Works on entry-level Android. 5 free scans, then from KSh 20. Pay with M-Pesa.",
}

/**
 * Landing page.
 *
 * One job: get the right person to download the app. Written for someone on an
 * entry-level Android phone in Kenya who is paying for their own data - so the
 * hook is concrete, the objections are answered on the page, and there is one
 * action repeated rather than several competing ones.
 *
 * Deliberately no testimonials or user counts: there is nothing real to quote
 * yet, and invented social proof is both dishonest and easy to spot.
 */
export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-[#0a0a0a] text-zinc-100">
      {/* Nav */}
      <nav className="flex items-center justify-between px-5 md:px-12 py-4 border-b border-zinc-800">
        <a href="/" className="flex items-center gap-2 font-bold text-lg tracking-tight">
          <span className="flex gap-0.5">
            <span className="w-1.5 h-4 bg-lime-400 rounded-sm" />
            <span className="w-1.5 h-4 bg-lime-400 rounded-sm opacity-60" />
            <span className="w-1.5 h-4 bg-lime-400 rounded-sm opacity-30" />
          </span>
          <span>foodlog</span>
        </a>
        <div className="flex items-center gap-5 text-sm">
          <a href="/pricing" className="text-zinc-400 hover:text-zinc-100 transition-colors">
            Pricing
          </a>
          <a
            href="/downloads/foodlog.apk"
            className="px-4 py-2 bg-lime-400 text-zinc-900 rounded-full font-semibold hover:bg-lime-300 transition-colors"
          >
            Get the app
          </a>
        </div>
      </nav>

      {/* Hero - the hook is the specific thing it does, not a slogan */}
      <section className="px-5 md:px-12 pt-14 pb-16 md:pt-24 md:pb-24">
        <div className="max-w-3xl mx-auto text-center">
          <p className="inline-block px-3 py-1 rounded-full bg-lime-400/10 border border-lime-400/30 text-lime-300 text-xs font-medium mb-6">
            Built for Android phones in Kenya
          </p>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.05] mb-5 text-balance">
            Snap your plate.
            <br />
            <span className="text-lime-400">See what you just ate.</span>
          </h1>
          <p className="text-zinc-400 text-lg md:text-xl max-w-xl mx-auto leading-relaxed mb-8">
            Point your camera at ugali, chapati, a plate of pilau — anything.
            Foodlog reads the photo and tells you the calories, protein, carbs and
            fat in seconds. No weighing. No searching a database that has never
            heard of your food.
          </p>

          <a
            href="/downloads/foodlog.apk"
            className="inline-block px-8 py-4 bg-lime-400 text-zinc-900 rounded-full font-bold text-lg hover:bg-lime-300 transition-colors"
          >
            Download free — 5 scans included
          </a>
          <p className="text-zinc-600 text-sm mt-3">
            Android APK · no card needed · nothing auto-renews
          </p>
        </div>
      </section>

      {/* The problem, named in the reader's words */}
      <section className="px-5 md:px-12 py-14 border-t border-zinc-800">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold mb-6 text-balance">
            Every other calorie app was built for someone else
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                t: "Your food isn't in there",
                d: "Search “githeri” in most apps and you get nothing, or an American approximation. Foodlog reads the actual plate in front of you.",
              },
              {
                t: "The price is in dollars",
                d: "A $10/month subscription is a lot of money for a food diary. A pass here starts at KSh 20 and you pay with M-Pesa.",
              },
              {
                t: "It eats your data and storage",
                d: "A small app, one photo per scan, and manual entries that cost nothing. It runs on entry-level phones.",
              },
            ].map((x) => (
              <div key={x.t} className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
                <h3 className="font-semibold mb-2">{x.t}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">{x.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works - three steps, no jargon */}
      <section id="how" className="px-5 md:px-12 py-14 border-t border-zinc-800">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold mb-8 text-balance">
            Three taps, start to finish
          </h2>
          <ol className="space-y-6">
            {[
              {
                n: "1",
                t: "Take the photo",
                d: "Before you eat, point and shoot. One photo is enough.",
              },
              {
                n: "2",
                t: "Check what it found",
                d: "You get each item with its calories and macros. Anything wrong, you edit it — the app learns what you actually eat.",
              },
              {
                n: "3",
                t: "Save it to your day",
                d: "Your totals update as you go. Look back over a day, a week or the whole year.",
              },
            ].map((s) => (
              <li key={s.n} className="flex gap-5">
                <span className="flex-none w-9 h-9 rounded-full bg-lime-400 text-zinc-900 font-bold flex items-center justify-center">
                  {s.n}
                </span>
                <div>
                  <h3 className="font-semibold mb-1">{s.t}</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed max-w-xl">{s.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Price, stated plainly before they have to ask */}
      <section className="px-5 md:px-12 py-14 border-t border-zinc-800">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold mb-3 text-balance">
            What it costs
          </h2>
          <p className="text-zinc-400 mb-8 max-w-xl">
            Typing food in by hand is always free and unlimited. Photo scans are
            the part that costs us money to run, so that's the part you pay for.
          </p>

          <div className="grid gap-4 sm:grid-cols-3 mb-8">
            {[
              { p: "KSh 20", n: "Day pass", d: "15 scans, 24 hours" },
              { p: "KSh 99", n: "Month pass", d: "200 scans, 30 days", best: true },
              { p: "KSh 249", n: "3-month pass", d: "600 scans, 90 days" },
            ].map((x) => (
              <div
                key={x.n}
                className={`rounded-2xl border p-5 ${
                  x.best ? "border-lime-400 bg-lime-400/5" : "border-zinc-800 bg-zinc-900/40"
                }`}
              >
                <p className="text-2xl font-extrabold tabular-nums">{x.p}</p>
                <p className="font-medium text-sm mt-1">{x.n}</p>
                <p className="text-zinc-500 text-xs mt-1">{x.d}</p>
              </div>
            ))}
          </div>

          <a href="/pricing" className="text-lime-400 hover:text-lime-300 text-sm font-medium">
            See full pricing and questions answered →
          </a>
        </div>
      </section>

      {/* Final ask - same action as the hero, no new options */}
      <section className="px-5 md:px-12 py-16 border-t border-zinc-800">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl md:text-4xl font-extrabold mb-4 text-balance">
            Try it on tonight's dinner
          </h2>
          <p className="text-zinc-400 mb-8">
            Five scans, free, no card. If it doesn't tell you something useful
            about your food, you've lost nothing.
          </p>
          <a
            href="/downloads/foodlog.apk"
            className="inline-block px-8 py-4 bg-lime-400 text-zinc-900 rounded-full font-bold text-lg hover:bg-lime-300 transition-colors"
          >
            Download Foodlog
          </a>
        </div>
      </section>

      <footer className="border-t border-zinc-800 px-5 md:px-12 py-6 flex flex-wrap gap-x-4 gap-y-2 justify-center text-zinc-600 text-xs">
        <span>foodlog</span>
        <a href="/pricing" className="hover:text-zinc-400">Pricing</a>
        <a href="/log" className="hover:text-zinc-400">Sign in</a>
        <a href="/downloads/foodlog.apk" className="hover:text-zinc-400">Download</a>
      </footer>
    </div>
  )
}
