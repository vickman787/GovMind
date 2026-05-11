import { useEffect, useState } from 'react'
import { getNetworkStats } from '../services/genlayerService'

export function Home({ onNavigate }) {
  const [networkStats, setNetworkStats] = useState([])

  useEffect(() => {
    async function loadNetworkStats() {
      const stats = await getNetworkStats()
      setNetworkStats(stats.slice(0, 3))
    }

    loadNetworkStats()
  }, [])

  return (
    <div className="flex flex-col gap-8">
      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-stretch">
        <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-7 shadow-2xl shadow-fuchsia-950/30 backdrop-blur-xl md:p-10">
          <p className="text-sm font-semibold uppercase text-cyan-300">DAO intelligence layer</p>
          <div className="space-y-5">
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight text-white md:text-5xl">
              Govern faster with proposals, signals, and reputation in one command center.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-300">
              GovMind is a mock DAO interface for exploring proposal flow,
              voting health, and contributor rankings before any chain
              integration is added.
            </p>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onNavigate('submit')}
              className="rounded-full bg-fuchsia-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_0_28px_rgba(217,70,239,0.35)] transition hover:bg-fuchsia-400"
            >
              Submit Proposal
            </button>
            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className="rounded-full border border-cyan-300/50 bg-cyan-300/10 px-5 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20"
            >
              View Dashboard
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.06] p-6 shadow-2xl shadow-emerald-950/20 backdrop-blur-xl">
          <p className="text-sm font-semibold text-emerald-300">Network Pulse</p>
          <div className="space-y-4">
            {networkStats.map((stat) => (
              <div key={stat.label} className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-slate-400">{stat.label}</span>
                  <span className="text-xl font-semibold text-white">{stat.value}</span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-white/10">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-cyan-300 via-fuchsia-400 to-emerald-300"
                    style={{ width: stat.level }}
                  />
                </div>
              </div>
            ))}
            {networkStats.length === 0 && (
              <p className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-slate-300">
                Loading GenLayer data...
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-white/10 bg-white/[0.05] p-5 backdrop-blur-xl">
          <h2 className="mb-3 text-base font-semibold text-white">Proposal Flow</h2>
          <p className="text-sm leading-6 text-slate-400">
            Draft, review, and inspect mock proposals without smart contracts.
          </p>
        </article>
        <article className="rounded-2xl border border-white/10 bg-white/[0.05] p-5 backdrop-blur-xl">
          <h2 className="mb-3 text-base font-semibold text-white">DAO Telemetry</h2>
          <p className="text-sm leading-6 text-slate-400">
            Track participation, quorum, treasury impact, and contributor activity.
          </p>
        </article>
        <article className="rounded-2xl border border-white/10 bg-white/[0.05] p-5 backdrop-blur-xl">
          <h2 className="mb-3 text-base font-semibold text-white">Reputation Layer</h2>
          <p className="text-sm leading-6 text-slate-400">
            Surface mock leaders by voting weight, proposal quality, and review streak.
          </p>
        </article>
      </section>
    </div>
  )
}
