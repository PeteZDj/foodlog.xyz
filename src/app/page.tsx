export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-[#0a0a0a] text-zinc-100">
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
        <div className="flex items-center gap-6 text-sm text-zinc-400">
          <a href="#features" className="hover:text-zinc-100 transition-colors">Features</a>
          <a href="#database" className="hover:text-zinc-100 transition-colors">Food database</a>
          <a
            href="/log"
            className="px-4 py-2 bg-zinc-100 text-zinc-900 rounded-full font-medium hover:bg-zinc-200 transition-colors"
          >
            Open my log
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 md:px-12 py-24 md:py-32 text-center">
        <p className="font-mono text-xs text-zinc-500 tracking-widest uppercase mb-6">
          01 / Know what you eat
        </p>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-tight mb-6 max-w-3xl">
          Nutrition,{" "}
          <em className="not-italic text-zinc-400">made legible.</em>
        </h1>
        <p className="text-lg md:text-xl text-zinc-400 max-w-xl leading-relaxed mb-10">
          A precise food journal for people who want the full picture. Log meals,
          inspect nutrients, attach photos, and understand patterns from today to
          the entire year.
        </p>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <a
            href="/log"
            className="px-8 py-3 bg-zinc-100 text-zinc-900 rounded-full font-semibold hover:bg-white transition-colors"
          >
            Start logging
          </a>
          <a href="#features" className="text-zinc-400 hover:text-zinc-100 transition-colors">
            Explore the system ↓
          </a>
        </div>

        {/* Proof strip */}
        <div className="mt-16 flex gap-10 text-sm text-zinc-500">
          <div className="text-center">
            <p className="text-zinc-100 font-bold text-base">100+</p>
            <p>built-in foods</p>
          </div>
          <div className="text-center">
            <p className="text-zinc-100 font-bold text-base">Global</p>
            <p>product lookup</p>
          </div>
          <div className="text-center">
            <p className="text-zinc-100 font-bold text-base">Private</p>
            <p>browser storage</p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-6 md:px-12 py-20 border-t border-zinc-800">
        <p className="font-mono text-xs text-zinc-500 tracking-widest uppercase mb-10">
          02 / What you get
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {[
            { label: "Daily log", desc: "Add meals by name, scan a barcode, or pick from your recent history. Breakfast to midnight snack, all in one place." },
            { label: "Macro tracking", desc: "Protein, carbs, fat — broken down per meal and across the day. See exactly where your calories come from." },
            { label: "Nutrient deep-dive", desc: "Go beyond macros. Track fibre, sugar, sodium, vitamins, and minerals with a single tap on any food item." },
            { label: "Photo attachment", desc: "Snap a photo of your meal. Visual context makes logging honest and reviewing patterns genuinely useful." },
            { label: "Pattern view", desc: "Weekly and monthly charts that reveal your actual eating habits. Spot the gaps and celebrate the wins." },
            { label: "Food database", desc: "100+ staple foods built in. Search a global database of millions more. Add custom items to make it yours." },
          ].map((f) => (
            <div key={f.label} className="border border-zinc-800 rounded-xl p-6 hover:border-zinc-700 transition-colors">
              <h3 className="font-semibold text-zinc-100 mb-2">{f.label}</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Food database callout */}
      <section id="database" className="px-6 md:px-12 py-20 border-t border-zinc-800">
        <p className="font-mono text-xs text-zinc-500 tracking-widest uppercase mb-6">
          03 / Food database
        </p>
        <div className="max-w-2xl">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Every food you actually eat.
          </h2>
          <p className="text-zinc-400 leading-relaxed mb-8">
            Start with 100+ pre-loaded staples — oats, chicken, rice, eggs, the
            basics. Search our global database of millions of products by name or
            barcode. Can't find something? Add a custom entry with your own
            nutrition values and it's stored privately in your browser.
          </p>
          <a
            href="/log"
            className="inline-flex items-center gap-2 px-6 py-3 border border-zinc-700 rounded-full text-sm font-medium hover:border-zinc-500 hover:text-white transition-colors"
          >
            Browse the database →
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 md:px-12 py-8 border-t border-zinc-800 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-zinc-600">
        <span>© {new Date().getFullYear()} Foodlog</span>
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          <a href="mailto:team@foodlog.xyz" className="text-zinc-400 hover:text-emerald-400 transition-colors">
            ✉ team@foodlog.xyz
          </a>
          <a href="https://docall.app/call/foodlog.xyz" target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-emerald-400 transition-colors">
            ☎ Call us on Docall
          </a>
          <a href="/downloads/foodlog.apk" download className="font-mono text-zinc-400 hover:text-emerald-400 transition-colors">
            ↓ Get the Android app
          </a>
        </div>
        <span className="font-mono">Daily nutrition, clearly.</span>
      </footer>
    </div>
  );
}
