const navItems = [
  { id: 'home', label: 'Home' },
  { id: 'submit', label: 'Submit Proposal' },
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'details', label: 'Proposal Details' },
  { id: 'leaderboard', label: 'Leaderboard' },
]

export function AppLayout({
  activePage,
  children,
  onConnectWallet,
  onNavigate,
  walletAddress,
}) {
  return (
    <div className="min-h-screen overflow-hidden bg-[#05020d] text-slate-100">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_34%),radial-gradient(circle_at_80%_20%,rgba(168,85,247,0.2),transparent_32%),radial-gradient(circle_at_50%_90%,rgba(74,222,128,0.12),transparent_28%)]" />
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#05020d]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="text-left text-lg font-semibold text-white"
          >
            GovMind
          </button>
          <nav
            aria-label="Primary navigation"
            className="flex w-full items-center gap-2 overflow-x-auto text-sm text-slate-300 md:w-auto"
          >
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`shrink-0 rounded-full border px-4 py-2 transition ${
                  activePage === item.id
                    ? 'border-cyan-300/60 bg-cyan-300/10 text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.18)]'
                    : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-fuchsia-300/50 hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
          <div className="flex w-full justify-start md:w-auto md:justify-end">
            {walletAddress ? (
              <span className="rounded-full border border-emerald-300/40 bg-emerald-300/10 px-4 py-2 text-sm font-semibold text-emerald-200">
                Connected: {walletAddress}
              </span>
            ) : (
              <button
                type="button"
                onClick={onConnectWallet}
                className="rounded-full border border-fuchsia-300/50 bg-fuchsia-300/10 px-4 py-2 text-sm font-semibold text-fuchsia-100 shadow-[0_0_24px_rgba(217,70,239,0.16)] transition hover:bg-fuchsia-300/20"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-8 md:py-12">{children}</main>
    </div>
  )
}
