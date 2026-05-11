import { useEffect, useState } from 'react'
import { getLeaderboard } from '../services/genlayerService'

export function Leaderboard() {
  const [members, setMembers] = useState([])

  useEffect(() => {
    async function loadLeaderboard() {
      const leaderboardMembers = await getLeaderboard()
      setMembers(leaderboardMembers)
    }

    loadLeaderboard()
  }, [])

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.06] p-6 backdrop-blur-xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase text-emerald-300">Top DAO contributors</p>
          <h1 className="mt-3 text-3xl font-semibold text-white md:text-4xl">Leaderboard</h1>
        </div>
        <span className="rounded-full border border-fuchsia-300/30 bg-fuchsia-300/10 px-3 py-1 text-xs text-fuchsia-200">
          Reputation mock
        </span>
      </div>

      <div className="grid gap-3">
        {members.length === 0 && (
          <p className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-slate-300">
            No leaderboard users yet. Submit a proposal with a connected wallet to appear here.
          </p>
        )}

        {members.map((member) => (
          <article
            key={member.rank}
            className="grid gap-4 rounded-xl border border-white/10 bg-black/20 p-4 md:grid-cols-[80px_1fr_auto]"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500 to-cyan-300 font-semibold text-white">
              #{member.rank}
            </div>
            <div>
              <h2 className="font-semibold text-white">{member.name}</h2>
              <p className="mt-1 text-sm text-slate-400">{member.role}</p>
              <p className="mt-1 break-words text-xs text-slate-500">{member.address}</p>
            </div>
            <div className="md:text-right">
              <p className="text-xl font-semibold text-emerald-300">{member.score}</p>
              <p className="text-sm text-slate-400">{member.streak}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
