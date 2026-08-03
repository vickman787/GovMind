import { useEffect, useState } from 'react'
import { analyzeProposal, getAllProposals, getProposal } from '../services/genlayerService'

export function ProposalDetails({ proposalId, onNavigate, onSelectProposal, walletAddress }) {
  const [proposal, setProposal] = useState(null)
  const [proposals, setProposals] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisError, setAnalysisError] = useState('')

  useEffect(() => {
    async function loadProposalDetails() {
      setIsLoading(true)

      const [serviceProposal, serviceProposals] = await Promise.all([
        getProposal(proposalId),
        getAllProposals(),
      ])

      // serviceProposal is null when proposalId doesn't exist on-chain.
      // That must render as "not found", not silently swapped for some
      // other real proposal - otherwise an invalid or missing ID would
      // appear to display a legitimate but unrelated proposal.
      setProposal(serviceProposal)
      setProposals(serviceProposals)
      setAnalysisError('')
      setIsLoading(false)
    }

    loadProposalDetails()
  }, [proposalId])

  const handleRunAnalysis = async () => {
    setIsAnalyzing(true)
    setAnalysisError('')

    try {
      if (!walletAddress) {
        throw new Error('Connect your wallet before requesting analysis.')
      }

      await analyzeProposal(proposal.id, walletAddress)
      const refreshedProposal = await getProposal(proposal.id)
      setProposal(refreshedProposal ?? proposal)
    } catch (error) {
      setAnalysisError(error.message)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const switcher = (
    <aside className="ai-panel rounded-2xl p-5">
      <h2 className="text-lg font-semibold text-white">Proposal Switcher</h2>
      <div className="mt-4 grid gap-3">
        {proposals.length === 0 && (
          <p className="text-sm text-slate-400">No proposals yet.</p>
        )}
        {proposals.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              onSelectProposal(item.id)
              onNavigate('details', item.id)
            }}
            className={`rounded-xl border p-3 text-left text-sm transition ${
              item.id === proposal?.id
                ? 'border-cyan-300/60 bg-cyan-300/10 text-cyan-100'
                : 'border-white/10 bg-black/20 text-slate-300 hover:border-cyan-300/50'
            }`}
          >
            <span className="block text-xs text-slate-400">Proposal #{item.id}</span>
            {item.title}
          </button>
        ))}
      </div>
    </aside>
  )

  if (isLoading) {
    return (
      <section className="ai-panel rounded-2xl p-5 sm:p-7">
        <h1 className="text-3xl font-semibold text-white md:text-4xl">Proposal Details</h1>
        <p className="mt-4 text-sm text-slate-300">Loading proposal details...</p>
      </section>
    )
  }

  if (!proposal) {
    return (
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="ai-panel rounded-2xl p-5 sm:p-7">
          <h1 className="text-3xl font-semibold text-white md:text-4xl">Proposal Details</h1>
          <p className="mt-4 text-sm text-slate-300">
            Proposal #{proposalId} was not found. It may not exist yet, or the ID may be wrong.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className="ai-secondary-button mt-4 rounded-full px-5 py-3 text-sm font-semibold transition hover:bg-cyan-300/20"
          >
            Go to Dashboard
          </button>
        </section>
        {switcher}
      </div>
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <section className="ai-panel rounded-2xl p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="ai-kicker">
            Proposal #{proposal.id}
          </p>
          <span className="rounded-full bg-emerald-300/10 px-3 py-1 text-xs text-emerald-200">
            {proposal.status}
          </span>
        </div>
        <h1 className="mt-4 text-3xl font-semibold text-white md:text-4xl">Proposal Details</h1>
        <h2 className="mt-3 break-words text-xl font-semibold text-slate-100 sm:text-2xl">
          {proposal.title}
        </h2>
        <p className="mt-3 break-words text-sm text-slate-400">Submitted by {proposal.creator}</p>
        <p className="mt-6 break-words text-sm leading-7 text-slate-300 sm:text-base">
          {proposal.proposal_text}
        </p>
        <div className="ai-card mt-6 rounded-xl p-5">
          <h2 className="text-base font-semibold text-white">AI Summary</h2>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            {proposal.analysis?.summary ?? 'This proposal has not been analyzed yet.'}
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Metric label="Recommendation" value={proposal.analysis?.recommendation ?? 'PENDING'} />
          <Metric label="Confidence" value={`${proposal.analysis?.confidence ?? 0}%`} />
          <Metric label="Risk score" value={`${proposal.analysis?.risk_score ?? 0}%`} />
        </div>

        {!proposal.analysis && (
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleRunAnalysis}
              disabled={isAnalyzing}
              className="ai-primary-button rounded-full px-5 py-3 text-sm font-semibold transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isAnalyzing ? 'Analyzing (this can take a couple of minutes)...' : 'Run GenLayer analysis'}
            </button>
            {!walletAddress && (
              <p className="text-sm text-slate-400">Connect your wallet to request analysis.</p>
            )}
          </div>
        )}

        {analysisError && (
          <p className="mt-4 rounded-xl border border-rose-300/30 bg-rose-300/10 px-4 py-3 text-sm text-rose-200">
            {analysisError}
          </p>
        )}
      </section>

      {switcher}
    </div>
  )
}

function Metric({ label, value }) {
  return (
    <div className="ai-card rounded-xl p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-2 break-words text-xl font-semibold text-white sm:text-2xl">{value}</p>
    </div>
  )
}
