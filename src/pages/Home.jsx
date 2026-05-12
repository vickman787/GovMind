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
    <div className="flex flex-col gap-5 sm:gap-8">
      <section className="grid gap-6 lg:grid-cols-[1fr_0.82fr] lg:items-stretch">
        <div className="ai-panel rounded-2xl p-5 sm:p-7 md:p-10">
          <p className="ai-kicker">DAO shield intelligence</p>
          <div className="space-y-5">
            <h1 className="mt-4 max-w-3xl text-3xl font-semibold leading-tight text-white sm:text-4xl md:text-5xl">
              Protect governance decisions with AI proposal intelligence.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">
              GovMind helps DAOs inspect proposals, evidence, treasury impact,
              and contributor reputation before capital moves onchain.
            </p>
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {['Evidence scan', 'Risk shield', 'Reputation signal'].map((label) => (
              <div key={label} className="ai-card rounded-xl px-4 py-3">
                <p className="text-xs font-semibold uppercase text-emerald-300">{label}</p>
                <div className="mt-3 h-1 rounded-full bg-gradient-to-r from-cyan-300 via-violet-400 to-emerald-300" />
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onNavigate('submit')}
              className="ai-primary-button w-full rounded-full px-5 py-3 text-sm font-semibold transition hover:brightness-110 sm:w-auto"
            >
              Submit Proposal
            </button>
            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className="ai-secondary-button w-full rounded-full px-5 py-3 text-sm font-semibold transition hover:bg-cyan-300/20 sm:w-auto"
            >
              View Dashboard
            </button>
          </div>
        </div>

        <div className="ai-panel flex flex-col justify-between rounded-2xl p-5 sm:p-6">
          <div>
            <p className="ai-kicker text-emerald-300">DAO Shield</p>
            <div className="mt-6 flex justify-center">
              <div className="shield-active relative flex h-44 w-44 items-center justify-center rounded-[2rem] border border-cyan-300/20 bg-slate-950/60 shadow-[0_0_60px_rgba(34,211,238,0.16)] sm:h-56 sm:w-56">
                <div className="shield-ring absolute inset-4 rounded-[1.5rem] border border-emerald-300/10" />
                <div className="shield-status-dot absolute right-5 top-5 h-3 w-3 rounded-full bg-emerald-300 shadow-[0_0_18px_rgba(110,231,183,0.9)]" />
                <img
                  src="/favicon.svg"
                  alt=""
                  className="shield-logo h-28 w-28 drop-shadow-[0_0_24px_rgba(34,211,238,0.38)] sm:h-36 sm:w-36"
                />
              </div>
            </div>
            <div className="mt-6 text-center">
              <h2 className="text-xl font-semibold text-white sm:text-2xl">
                Review before you route treasury.
              </h2>
              <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-400">
                The shield represents proposal quality, evidence checks, and governance risk signals.
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {networkStats.map((stat) => (
              <div key={stat.label} className="ai-card rounded-xl p-4">
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
              <p className="ai-card rounded-xl p-4 text-sm text-slate-300">
                Loading GenLayer data...
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="ai-panel rounded-2xl p-5">
          <h2 className="mb-3 text-base font-semibold text-white">Proposal Flow</h2>
          <p className="text-sm leading-6 text-slate-400">
            Draft, review, and inspect proposals before voters commit to action.
          </p>
        </article>
        <article className="ai-panel rounded-2xl p-5">
          <h2 className="mb-3 text-base font-semibold text-white">Risk Telemetry</h2>
          <p className="text-sm leading-6 text-slate-400">
            Track participation, quorum, treasury impact, and contributor activity.
          </p>
        </article>
        <article className="ai-panel rounded-2xl p-5">
          <h2 className="mb-3 text-base font-semibold text-white">Reputation Layer</h2>
          <p className="text-sm leading-6 text-slate-400">
            Surface mock leaders by voting weight, proposal quality, and review streak.
          </p>
        </article>
      </section>
    </div>
  )
}
