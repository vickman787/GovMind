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
  onConnectBrowserWallet,
  onDisconnectWallet,
  onNavigate,
  walletAddress,
  walletError,
}) {
  const shortAddress = formatAddress(walletAddress)

  return (
    <div className="console-grid min-h-screen overflow-hidden text-slate-100">
      <header className="sticky top-0 z-20 border-b border-cyan-300/10 bg-slate-950/82 backdrop-blur-xl">
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
                    : 'border-slate-700/80 bg-slate-950/60 text-slate-300 hover:border-violet-300/50 hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
          <div className="flex w-full justify-start md:w-auto md:justify-end">
            {walletAddress ? (
              <button
                type="button"
                onClick={onDisconnectWallet}
                title="Disconnect wallet"
                className="rounded-full border border-emerald-300/40 bg-emerald-300/10 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:border-rose-300/60 hover:bg-rose-300/10 hover:text-rose-100"
              >
                Disconnect: {shortAddress}
              </button>
            ) : (
              <button
                type="button"
                onClick={onConnectBrowserWallet}
                className="rounded-full border border-cyan-300/50 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.16)] transition hover:bg-cyan-300/20"
              >
                Connect Wallet
              </button>
            )}
          </div>
          {walletError && (
            <p className="w-full text-xs text-amber-300 md:text-right">{walletError}</p>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-8 md:py-12">{children}</main>
    </div>
  )
}

function formatAddress(address) {
  if (!address) {
    return ''
  }

  if (address.includes('...')) {
    return address
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`
}
