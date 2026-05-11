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
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-4">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="order-1 text-left text-lg font-semibold text-white"
          >
            GovMind
          </button>
          <nav
            aria-label="Primary navigation"
            className="order-3 flex w-full items-center gap-2 overflow-x-auto pb-1 text-sm text-slate-300 md:order-2 md:w-auto md:pb-0"
          >
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`shrink-0 rounded-full border px-3 py-2 text-xs transition sm:px-4 sm:text-sm ${
                  activePage === item.id
                    ? 'border-cyan-300/60 bg-cyan-300/10 text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.18)]'
                    : 'border-slate-700/80 bg-slate-950/60 text-slate-300 hover:border-violet-300/50 hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
          <div className="order-2 flex max-w-[58%] justify-end md:order-3 md:max-w-none">
            {walletAddress ? (
              <button
                type="button"
                onClick={onDisconnectWallet}
                title="Disconnect wallet"
                className="max-w-full truncate rounded-full border border-emerald-300/40 bg-emerald-300/10 px-3 py-2 text-xs font-semibold text-emerald-200 transition hover:border-rose-300/60 hover:bg-rose-300/10 hover:text-rose-100 sm:px-4 sm:text-sm"
              >
                Disconnect: {shortAddress}
              </button>
            ) : (
              <button
                type="button"
                onClick={onConnectBrowserWallet}
                className="rounded-full border border-cyan-300/50 bg-cyan-300/10 px-3 py-2 text-xs font-semibold text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.16)] transition hover:bg-cyan-300/20 sm:px-4 sm:text-sm"
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

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-5 md:py-12">{children}</main>
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
