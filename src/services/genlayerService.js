import { genlayerConfig } from '../config/genlayerConfig'

const MOCK_MODE = genlayerConfig.mockMode

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
]

const mockReputation = {
  '0xMockCreator001': 12,
  '0xMockDelegate002': 27,
}

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

  // TODO: Real GenLayer integration placeholder.
  // Later, import the official genlayer-js client here and connect it with:
  // - genlayerConfig.rpcUrl
  // - genlayerConfig.contractAddress
  //
  // Then call GovMindContract.submit_proposal(
  //   proposalData.title,
  //   proposalData.proposal_text,
  //   proposalData.evidence_url,
  // )
  //
  // Return the structured proposal JSON from the contract response.
  throw new Error('GenLayer submitProposal is not implemented yet.')
}

export async function analyzeProposal(proposalId) {
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

  // TODO: Real GenLayer integration placeholder.
  // Later, use genlayer-js to call GovMindContract.analyze_proposal(proposalId).
  // The deployed contract will fetch evidence and run the AI analysis.
  throw new Error('GenLayer analyzeProposal is not implemented yet.')
}

export async function getProposal(proposalId) {
  if (MOCK_MODE) {
    const proposal = mockProposals.find((item) => item.id === Number(proposalId))
    return proposal ?? { error: 'PROPOSAL_NOT_FOUND' }
  }

  // TODO: Real GenLayer integration placeholder.
  // Later, use genlayer-js to call GovMindContract.get_proposal(proposalId).
  throw new Error('GenLayer getProposal is not implemented yet.')
}

export async function getAllProposals() {
  if (MOCK_MODE) {
    return mockProposals
  }

  // TODO: Real GenLayer integration placeholder.
  // Later, use genlayer-js to call GovMindContract.get_all_proposals().
  throw new Error('GenLayer getAllProposals is not implemented yet.')
}

export async function getUserReputation(address) {
  if (MOCK_MODE) {
    return {
      address,
      reputation: mockReputation[address] ?? 0,
    }
  }

  // TODO: Real GenLayer integration placeholder.
  // Later, use genlayer-js to call GovMindContract.get_user_reputation(address).
  throw new Error('GenLayer getUserReputation is not implemented yet.')
}
