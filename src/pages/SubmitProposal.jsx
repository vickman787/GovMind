import { useState } from 'react'

import { analyzeProposal, submitProposal } from '../services/genlayerService'

const inputStyle =
  'w-full rounded-xl border border-cyan-300/10 bg-slate-950/55 px-4 py-3 text-base text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/70 focus:ring-2 focus:ring-cyan-300/20 sm:text-sm'

const initialForm = {
  title: '',
  description: '',
  evidenceUrl: '',
  treasuryAmount: '',
  requestedFunding: '',
}

const recommendationStyles = {
  APPROVE: 'border-emerald-300/40 bg-emerald-300/10 text-emerald-200',
  REJECT: 'border-rose-300/40 bg-rose-300/10 text-rose-200',
  NEEDS_REVISION: 'border-fuchsia-300/40 bg-fuchsia-300/10 text-fuchsia-200',
  INSUFFICIENT_CONTEXT: 'border-amber-300/40 bg-amber-300/10 text-amber-200',
}

export function SubmitProposal({ walletAddress }) {
  const [formData, setFormData] = useState(initialForm)
  const [analysis, setAnalysis] = useState(null)
  const [submittedProposal, setSubmittedProposal] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const updateField = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      if (!walletAddress) {
        throw new Error('Connect your wallet before sending a GenLayer transaction.')
      }

      const proposal = await submitProposal({
        title: formData.title,
        proposal_text: formData.description,
        evidence_url: formData.evidenceUrl,
        creator: walletAddress,
        treasury_amount: formData.treasuryAmount,
        requested_funding: formData.requestedFunding,
      })
      const result = await analyzeProposal(proposal.id, walletAddress)

      setSubmittedProposal(proposal)
      setAnalysis(result)
    } catch (serviceError) {
      setError(serviceError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
      <div className="ai-panel rounded-2xl p-5 sm:p-7">
        <p className="ai-kicker text-violet-300">Proposal intake</p>
        <h1 className="mt-4 text-3xl font-semibold text-white md:text-4xl">Submit Proposal</h1>
        <p className="mt-3 text-lg text-slate-200 sm:text-xl">
          Draft a governance action for AI review.
        </p>
        <p className="mt-4 text-sm leading-6 text-slate-300">
          Submissions are sent through your connected wallet.
        </p>

        <div className="ai-card mt-6 rounded-xl p-4">
          <p className="text-sm font-semibold text-cyan-200">
            GenLayer AI analyzer
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Fill the form and submit to store the proposal, then request GenLayer analysis.
          </p>
        </div>

        <div className="ai-card mt-4 rounded-xl p-4">
          <p className="text-sm font-semibold text-slate-200">Creator address</p>
            <p className="mt-2 break-words text-sm text-slate-300">
              {walletAddress || 'Connect a wallet to submit with your address.'}
            </p>
        </div>

        {submittedProposal && (
          <div className="mt-4 rounded-xl border border-emerald-300/20 bg-emerald-300/10 p-4">
            <p className="text-sm font-semibold text-emerald-200">Submitted proposal</p>
            <p className="mt-2 break-words text-sm text-slate-300">
              ID #{submittedProposal.id} is stored in the GovMind service
              by {submittedProposal.creator}.
            </p>
          </div>
        )}
      </div>

      <div className="grid gap-6">
        <form
          onSubmit={handleSubmit}
          className="ai-panel rounded-2xl p-5 sm:p-6"
        >
          <div className="grid gap-5">
            <label className="grid gap-2 text-sm text-slate-300">
              Proposal title
              <input
                className={inputStyle}
                placeholder="Launch citizen research grants"
                value={formData.title}
                onChange={(event) => updateField('title', event.target.value)}
              />
            </label>
            <label className="grid gap-2 text-sm text-slate-300">
              Proposal description
              <textarea
                className={`${inputStyle} min-h-36 resize-y`}
                placeholder="Describe what the proposal does, who benefits, milestones, and how success will be measured."
                value={formData.description}
                onChange={(event) => updateField('description', event.target.value)}
              />
            </label>
            <label className="grid gap-2 text-sm text-slate-300">
              Evidence URL
              <input
                className={inputStyle}
                placeholder="https://forum.govmind.example/research-plan"
                value={formData.evidenceUrl}
                onChange={(event) => updateField('evidenceUrl', event.target.value)}
              />
            </label>
            <div className="grid gap-5 md:grid-cols-2">
              <label className="grid gap-2 text-sm text-slate-300">
                DAO treasury amount
                <input
                  className={inputStyle}
                  inputMode="decimal"
                  placeholder="2400000"
                  value={formData.treasuryAmount}
                  onChange={(event) => updateField('treasuryAmount', event.target.value)}
                />
              </label>
              <label className="grid gap-2 text-sm text-slate-300">
                Requested funding amount
                <input
                  className={inputStyle}
                  inputMode="decimal"
                  placeholder="120000"
                  value={formData.requestedFunding}
                  onChange={(event) => updateField('requestedFunding', event.target.value)}
                />
              </label>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="ai-primary-button w-full rounded-full px-5 py-3 text-sm font-semibold transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
              >
                {isSubmitting ? 'Analyzing...' : 'Submit to GenLayer'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormData(initialForm)
                  setAnalysis(null)
                  setSubmittedProposal(null)
                  setError('')
                }}
                className="ai-secondary-button w-full rounded-full px-5 py-3 text-sm font-semibold transition hover:bg-cyan-300/20 sm:w-auto"
              >
                Reset
              </button>
            </div>
            {error && (
              <p className="rounded-xl border border-rose-300/30 bg-rose-300/10 px-4 py-3 text-sm text-rose-200">
                {error}
              </p>
            )}
          </div>
        </form>

        {analysis && <AnalysisResult analysis={analysis} />}
      </div>
    </section>
  )
}

function AnalysisResult({ analysis }) {
  return (
    <section className="ai-panel rounded-2xl p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="ai-kicker">AI analysis packet</p>
          <h2 className="mt-2 text-xl font-semibold text-white sm:text-2xl">
            Proposal Review Result
          </h2>
        </div>
        <span
          className={`rounded-full border px-3 py-2 text-xs font-semibold sm:px-4 sm:text-sm ${
            recommendationStyles[analysis.recommendation]
          }`}
        >
          {analysis.recommendation}
        </span>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ScoreCard label="Confidence score" value={`${analysis.confidence}%`} />
        <ScoreCard label="Risk score" value={`${analysis.risk_score}%`} />
        <ScoreCard label="Treasury impact" value={analysis.treasury_impact} />
        <ScoreCard label="Governance attack risk" value={analysis.governance_attack_risk} />
      </div>

      <div className="ai-card mt-6 rounded-xl p-5">
        <h3 className="text-base font-semibold text-white">Summary</h3>
        <p className="mt-3 text-sm leading-6 text-slate-300">{analysis.summary}</p>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <ResultList title="Benefits" items={analysis.benefits} accent="text-emerald-300" />
        <ResultList title="Risks" items={analysis.risks} accent="text-rose-300" />
        <ResultList
          title="Missing details"
          items={analysis.missing_details}
          accent="text-amber-300"
        />
        <ResultList
          title="Suggested improvements"
          items={analysis.suggested_improvements}
          accent="text-cyan-300"
        />
      </div>
    </section>
  )
}

function ScoreCard({ label, value }) {
  return (
    <div className="ai-card rounded-xl p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-2 break-words text-lg font-semibold text-white sm:text-xl">{value}</p>
    </div>
  )
}

function ResultList({ accent, items, title }) {
  return (
    <div className="ai-card rounded-xl p-5">
      <h3 className={`text-base font-semibold ${accent}`}>{title}</h3>
      <ul className="mt-3 grid gap-2 text-sm leading-6 text-slate-300">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
