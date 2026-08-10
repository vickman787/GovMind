import { genlayerConfig } from '../config/genlayerConfig'

let genlayerReadClient = null
let genlayerWriteClient = null
let genlayerWriteAccount = null
let genlayerWriteProvider = null

export async function submitProposal(proposalData) {
  const client = await getGenLayerWriteClient(proposalData.creator)
  const transactionHash = await client.writeContract({
    address: getContractAddress(),
    functionName: 'submit_proposal',
    args: [proposalData.title, proposalData.proposal_text, proposalData.evidence_url],
    value: BigInt(0),
  })

  // ACCEPTED is provisional - GenLayer allows an appeal window before a
  // transaction's result is final. Waiting only for ACCEPTED (as this used
  // to) means the UI could show a result that later gets overturned, so we
  // wait for FINALIZED instead, which takes longer but is the only state
  // that's actually canonical.
  await waitForFinalizedTransaction(client, transactionHash, {
    interval: 4000,
    retries: 40,
  })

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
  const client = await getGenLayerWriteClient(walletAddress)
  const transactionHash = await client.writeContract({
    address: getContractAddress(),
    functionName: 'analyze_proposal',
    args: [String(proposalId)],
    value: BigInt(0),
  })

  // analyze_proposal now runs three separate validator consensus rounds
  // (evidence hash, independently-compared classification, narrative) and
  // then has to clear the FINALIZED appeal window on top of that, so this
  // needs a much larger budget than a single round did.
  await waitForFinalizedTransaction(client, transactionHash, {
    interval: 5000,
    retries: 90,
  })

  const proposal = await getProposal(proposalId)
  return normalizeAnalysis(proposal?.ai_analysis ?? proposal?.analysis)
}

// Returns null when proposalId doesn't exist. Callers must treat null as
// "not found" - silently substituting a different real proposal here would
// make an invalid or missing proposal ID appear to show a legitimate but
// unrelated one.
export async function getProposal(proposalId) {
  const result = await readContract('get_proposal', [String(proposalId ?? '0')])
  const proposal = parseContractJson(result)

  if (proposal?.error) {
    return null
  }

  return normalizeProposal(proposal)
}

export async function getAllProposals() {
  const result = await readContract('get_all_proposals', [])
  const proposals = parseContractJson(result)

  if (!Array.isArray(proposals) || proposals.length === 0) {
    return []
  }

  return proposals.map(normalizeProposal)
}

export async function getUserReputation(address) {
  const result = await readContract('get_user_reputation', [address])
  const reputation = parseContractJson(result)

  return {
    address,
    reputation: Number(reputation?.reputation ?? 0),
  }
}

export async function getLeaderboard() {
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
      streak: `${Number(user.reputation ?? 0)} approved or revisable proposals`,
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
    // 'latest-final' (TransactionHashVariant.LATEST_FINAL) reads only
    // finalized state, so displayed proposals/analyses/reputation never
    // reflect a result that's still inside its appeal window and could
    // still be overturned. The previous stateStatus: 'accepted' option had
    // no effect - this client version's readContract doesn't recognize it.
    transactionHashVariant: 'latest-final',
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

async function waitForFinalizedTransaction(client, transactionHash, { interval, retries } = {}) {
  try {
    const { TransactionStatus } = await import('genlayer-js/types')
    await client.waitForTransactionReceipt({
      hash: transactionHash,
      status: TransactionStatus.FINALIZED,
      ...(interval ? { interval } : {}),
      ...(retries ? { retries } : {}),
    })
  } catch (error) {
    if (error?.message?.includes('Timed out waiting for transaction')) {
      throw error
    }

    await client.waitForTransactionReceipt({
      hash: transactionHash,
      ...(interval ? { interval } : {}),
      ...(retries ? { retries } : {}),
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
