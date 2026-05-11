import { genlayerConfig } from '../config/genlayerConfig'

const MOCK_MODE = genlayerConfig.mockMode
let genlayerReadClient = null
let genlayerWriteClient = null
let genlayerWriteAccount = null
let genlayerWriteProvider = null

const mockAnalysis = {
  recommendation: 'NEEDS_REVISION',
  confidence: 82,
  risk_score: 38,
  treasury_impact: 'MEDIUM',
  governance_attack_risk: 'LOW',
  summary:
    'The proposal has a clear public-goods goal, but it needs stronger milestones and budget controls before approval.',
  benefits: [
    'Improves DAO visibility into civic research outcomes.',
    'Creates reusable public dashboards for future proposal reviews.',
    'Includes an evidence URL that voters can inspect.',
  ],
  risks: [
    'Budget scope may expand without milestone-based releases.',
    'Success metrics are still broad.',
  ],
  missing_details: [
    'Named delivery owner',
    'Milestone dates',
    'Refund process for unused funds',
  ],
  suggested_improvements: [
    'Split funding into milestone-based tranches.',
    'Add measurable success criteria.',
    'Attach a detailed budget sheet.',
  ],
  evidence_used: ['https://forum.govmind.example/public-records-research'],
}

let mockProposals = [
  {
    id: 1,
    title: 'Fund public records research',
    proposal_text:
      'Create a six month research program that maps public records workflows and publishes monthly reports for DAO voters.',
    evidence_url: 'https://forum.govmind.example/public-records-research',
    creator: '0xMockCreator001',
    status: 'ANALYZED',
    analysis: mockAnalysis,
    timestamp: 1778495280000,
  },
  {
    id: 2,
    title: 'Upgrade delegate review cadence',
    proposal_text:
      'Move delegate reviews to a monthly rhythm with public scorecards, transparent notes, and clear accountability signals for voters.',
    evidence_url: 'https://forum.govmind.example/delegate-review-cadence',
    creator: '0xMockDelegate002',
    status: 'REVIEW',
    analysis: {
      ...mockAnalysis,
      recommendation: 'APPROVE',
      confidence: 88,
      risk_score: 24,
      treasury_impact: 'LOW',
      summary:
        'The review cadence is low risk and improves delegate accountability with a clear operational process.',
    },
    timestamp: 1778498880000,
  },
  {
    id: 3,
    title: 'Fund onchain policy simulations',
    proposal_text:
      'Prototype simulations for grant scoring, treasury allocation, and dispute resolution so voters can compare likely outcomes before governance votes.',
    evidence_url: 'https://forum.govmind.example/policy-simulations',
    creator: '0xMockSignal003',
    status: 'QUEUED',
    analysis: null,
    timestamp: 1778502480000,
  },
]

const mockReputation = {
  '0xMockCreator001': 12,
  '0xMockDelegate002': 27,
  '0xMockSignal003': 18,
  '0xMockMira004': 9,
  '0xMockOrbit005': 15,
}

const fallbackProposal = mockProposals[0]
const mockLeaderboard = [
  {
    rank: 1,
    name: 'Nova Council',
    address: '0xMockCreator001',
    role: 'Delegate',
    score: mockReputation['0xMockCreator001'],
    streak: '21 votes',
  },
  {
    rank: 2,
    name: 'Astra Labs',
    address: '0xMockDelegate002',
    role: 'Research Cell',
    score: mockReputation['0xMockDelegate002'],
    streak: '14 reviews',
  },
  {
    rank: 3,
    name: 'Signal Guild',
    address: '0xMockSignal003',
    role: 'Operations',
    score: mockReputation['0xMockSignal003'],
    streak: '18 votes',
  },
  {
    rank: 4,
    name: 'Mira Chen',
    address: '0xMockMira004',
    role: 'Treasury Analyst',
    score: mockReputation['0xMockMira004'],
    streak: '9 reviews',
  },
  {
    rank: 5,
    name: 'Orbit Forum',
    address: '0xMockOrbit005',
    role: 'Community',
    score: mockReputation['0xMockOrbit005'],
    streak: '12 votes',
  },
]

export async function submitProposal(proposalData) {
  if (MOCK_MODE) {
    const proposal = {
      id: mockProposals.length + 1,
      title: proposalData.title,
      proposal_text: proposalData.proposal_text,
      evidence_url: proposalData.evidence_url,
      creator: proposalData.creator ?? '0xMockCurrentUser',
      status: 'SUBMITTED',
      analysis: null,
      timestamp: Date.now(),
    }

    mockProposals = [...mockProposals, proposal]
    return proposal
  }

  const client = await getGenLayerWriteClient(proposalData.creator)
  const transactionHash = await client.writeContract({
    address: getContractAddress(),
    functionName: 'submit_proposal',
    args: [proposalData.title, proposalData.proposal_text, proposalData.evidence_url],
    value: BigInt(0),
  })

  await waitForAcceptedTransaction(client, transactionHash)

  const proposals = await getAllProposals()
  return proposals[proposals.length - 1] ?? {
    id: '0',
    title: proposalData.title,
    proposal_text: proposalData.proposal_text,
    evidence_url: proposalData.evidence_url,
    creator: proposalData.creator ?? '0xGenLayerUser',
    status: 'SUBMITTED',
    analysis: null,
    ai_analysis: null,
    timestamp: Date.now(),
  }
}

export async function analyzeProposal(proposalId, walletAddress) {
  if (MOCK_MODE) {
    const proposal = mockProposals.find((item) => item.id === Number(proposalId))

    if (!proposal) {
      return { error: 'PROPOSAL_NOT_FOUND' }
    }

    const updatedProposal = {
      ...proposal,
      status: 'ANALYZED',
      analysis: mockAnalysis,
    }

    mockProposals = mockProposals.map((item) =>
      item.id === updatedProposal.id ? updatedProposal : item,
    )

    return mockAnalysis
  }

  const client = await getGenLayerWriteClient(walletAddress)
  const transactionHash = await client.writeContract({
    address: getContractAddress(),
    functionName: 'analyze_proposal',
    args: [String(proposalId)],
    value: BigInt(0),
  })

  await waitForAcceptedTransaction(client, transactionHash)

  const proposal = await getProposal(proposalId)
  return normalizeAnalysis(proposal.ai_analysis ?? proposal.analysis)
}

export async function getProposal(proposalId) {
  if (MOCK_MODE) {
    const normalizedId = Number(proposalId)
    const proposal = mockProposals.find((item) => item.id === normalizedId)
    return proposal ?? fallbackProposal
  }

  const result = await readContract('get_proposal', [String(proposalId ?? '0')])
  const proposal = parseContractJson(result)

  if (proposal?.error) {
    const proposals = await getAllProposals()
    return proposals[0] ?? fallbackProposal
  }

  return normalizeProposal(proposal)
}

export async function getAllProposals() {
  if (MOCK_MODE) {
    return [...mockProposals]
  }

  const result = await readContract('get_all_proposals', [])
  const proposals = parseContractJson(result)

  if (!Array.isArray(proposals) || proposals.length === 0) {
    return []
  }

  return proposals.map(normalizeProposal)
}

export async function getUserReputation(address) {
  if (MOCK_MODE) {
    return {
      address,
      reputation: mockReputation[address] ?? 0,
    }
  }

  const result = await readContract('get_user_reputation', [address])
  const reputation = parseContractJson(result)

  return {
    address,
    reputation: Number(reputation?.reputation ?? 0),
  }
}

export async function getLeaderboard() {
  if (MOCK_MODE) {
    return mockLeaderboard
  }

  const result = await readContract('get_leaderboard', [])
  const users = parseContractJson(result)

  if (!Array.isArray(users)) {
    return []
  }

  return users
    .map((user, index) => ({
      rank: index + 1,
      name: shortenAddress(user.address),
      address: user.address,
      role: 'GenLayer user',
      score: Number(user.reputation ?? 0),
      streak: `${Number(user.reputation ?? 0)} submissions`,
    }))
    .sort((first, second) => second.score - first.score)
    .map((user, index) => ({
      ...user,
      rank: index + 1,
    }))
}

export async function getNetworkStats() {
  const [proposals, leaderboard] = await Promise.all([
    getAllProposals(),
    getLeaderboard(),
  ])

  const analyzedCount = proposals.filter((proposal) => proposal.analysis).length
  const pendingCount = proposals.length - analyzedCount
  const contributors = new Set([
    ...proposals.map((proposal) => proposal.creator).filter(Boolean),
    ...leaderboard.map((user) => user.address).filter(Boolean),
  ])

  return [
    {
      label: 'Active proposals',
      value: String(proposals.length),
      level: percentageLevel(proposals.length, 10),
    },
    {
      label: 'Analyzed proposals',
      value: String(analyzedCount),
      level: proposals.length === 0 ? '0%' : `${Math.round((analyzedCount / proposals.length) * 100)}%`,
    },
    {
      label: 'DAO contributors',
      value: String(contributors.size),
      level: percentageLevel(contributors.size, 10),
    },
    {
      label: 'Pending analysis',
      value: String(pendingCount),
      level: proposals.length === 0 ? '0%' : `${Math.round((pendingCount / proposals.length) * 100)}%`,
    },
  ]
}

async function readContract(functionName, args) {
  const client = await getGenLayerReadClient()

  return client.readContract({
    address: getContractAddress(),
    functionName,
    args,
    stateStatus: 'accepted',
  })
}

async function getGenLayerReadClient() {
  if (!genlayerConfig.contractAddress) {
    throw new Error('Missing VITE_GENLAYER_CONTRACT_ADDRESS.')
  }

  if (genlayerReadClient) {
    return genlayerReadClient
  }

  const [{ createClient }, chains] = await Promise.all([
    import('genlayer-js'),
    import('genlayer-js/chains'),
  ])

  genlayerReadClient = createClient({
    chain: getConfiguredChain(chains),
  })

  return genlayerReadClient
}

async function getGenLayerWriteClient(walletAddress) {
  if (!genlayerConfig.contractAddress) {
    throw new Error('Missing VITE_GENLAYER_CONTRACT_ADDRESS.')
  }

  if (!isValidHexAddress(walletAddress)) {
    throw new Error('Connect a real wallet before sending a GenLayer transaction.')
  }

  const browserProvider = getBrowserProvider()

  if (!browserProvider) {
    throw new Error('No browser wallet found. Install or enable a GenLayer-compatible wallet.')
  }

  const requestedAccount = normalizeHexAddress(walletAddress)

  if (
    genlayerWriteClient &&
    genlayerWriteAccount === requestedAccount &&
    genlayerWriteProvider === browserProvider
  ) {
    return genlayerWriteClient
  }

  const [{ createClient }, chains] = await Promise.all([
    import('genlayer-js'),
    import('genlayer-js/chains'),
  ])

  genlayerWriteAccount = requestedAccount
  genlayerWriteProvider = browserProvider
  genlayerWriteClient = createClient({
    account: requestedAccount,
    chain: getConfiguredChain(chains),
    provider: browserProvider,
  })

  await connectWalletToConfiguredNetwork(genlayerWriteClient)

  return genlayerWriteClient
}

function shortenAddress(address) {
  if (!address || address.length < 12) {
    return address ?? 'Unknown user'
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

function percentageLevel(value, max) {
  return `${Math.min(100, Math.round((value / max) * 100))}%`
}

function getConfiguredChain(chains) {
  const rpcUrl = genlayerConfig.rpcUrl
  const baseChain = getBaseChain(chains, rpcUrl)

  if (!rpcUrl) {
    return baseChain
  }

  return {
    ...baseChain,
    rpcUrls: {
      ...baseChain.rpcUrls,
      default: {
        http: [rpcUrl],
      },
      public: {
        http: [rpcUrl],
      },
    },
  }
}

function getBaseChain(chains, rpcUrl) {
  if (rpcUrl.includes('studio.genlayer.com')) {
    return chains.studionet
  }
  if (rpcUrl.includes('bradbury')) {
    return chains.testnetBradbury
  }
  if (rpcUrl.includes('asimov')) {
    return chains.testnetAsimov
  }
  if (rpcUrl.includes('localhost') || rpcUrl.includes('127.0.0.1')) {
    return chains.localnet
  }

  return chains.studionet
}

function getBrowserProvider() {
  if (typeof window === 'undefined') {
    return null
  }

  return window.ethereum ?? null
}

function isValidHexAddress(address) {
  return /^0x[a-fA-F0-9]{40}$/.test(address ?? '')
}

function normalizeHexAddress(address) {
  return address
}

function getContractAddress() {
  const address = genlayerConfig.contractAddress.trim()

  if (!isValidHexAddress(address)) {
    throw new Error('VITE_GENLAYER_CONTRACT_ADDRESS must be a valid 0x address.')
  }

  return address
}

async function connectWalletToConfiguredNetwork(client) {
  if (typeof client.connect !== 'function') {
    return
  }

  try {
    await client.connect(getConfiguredNetworkName())
  } catch {
    // The write call will show the wallet/network error if switching is unsupported.
  }
}

function getConfiguredNetworkName() {
  const rpcUrl = genlayerConfig.rpcUrl

  if (rpcUrl.includes('bradbury')) {
    return 'testnetBradbury'
  }
  if (rpcUrl.includes('asimov')) {
    return 'testnetAsimov'
  }
  if (rpcUrl.includes('localhost') || rpcUrl.includes('127.0.0.1')) {
    return 'localnet'
  }

  return 'studionet'
}

async function waitForAcceptedTransaction(client, transactionHash) {
  try {
    const { TransactionStatus } = await import('genlayer-js/types')
    await client.waitForTransactionReceipt({
      hash: transactionHash,
      status: TransactionStatus.ACCEPTED,
    })
  } catch {
    await client.waitForTransactionReceipt({
      hash: transactionHash,
    })
  }
}

function parseContractJson(result) {
  if (typeof result === 'string') {
    return JSON.parse(result)
  }

  return result
}

function normalizeProposal(proposal) {
  const analysis = proposal.ai_analysis ?? proposal.analysis ?? null

  return {
    ...proposal,
    status: analysis ? 'ANALYZED' : (proposal.status ?? 'SUBMITTED'),
    analysis,
  }
}

function normalizeAnalysis(analysis) {
  return {
    recommendation: analysis?.recommendation ?? 'INSUFFICIENT_CONTEXT',
    confidence: Number(analysis?.confidence ?? 0),
    risk_score: Number(analysis?.risk_score ?? 0),
    treasury_impact: analysis?.treasury_impact ?? 'LOW',
    governance_attack_risk: analysis?.governance_attack_risk ?? 'LOW',
    summary: analysis?.summary ?? '',
    benefits: Array.isArray(analysis?.benefits) ? analysis.benefits : [],
    risks: Array.isArray(analysis?.risks) ? analysis.risks : [],
    missing_details: Array.isArray(analysis?.missing_details)
      ? analysis.missing_details
      : [],
    suggested_improvements: Array.isArray(analysis?.suggested_improvements)
      ? analysis.suggested_improvements
      : [],
    evidence_used: Array.isArray(analysis?.evidence_used) ? analysis.evidence_used : [],
  }
}
