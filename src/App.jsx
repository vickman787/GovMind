import { useState } from 'react'
import { AppLayout } from './components/AppLayout'
import { Dashboard } from './pages/Dashboard'
import { Home } from './pages/Home'
import { Leaderboard } from './pages/Leaderboard'
import { ProposalDetails } from './pages/ProposalDetails'
import { SubmitProposal } from './pages/SubmitProposal'

const MOCK_WALLET_ADDRESS = '0xA17c...GovMind'

function App() {
  const [activePage, setActivePage] = useState('home')
  const [activeProposalId, setActiveProposalId] = useState(1)
  const [walletAddress, setWalletAddress] = useState('')

  const navigate = (page, proposalId) => {
    if (proposalId) {
      setActiveProposalId(proposalId)
    }
    setActivePage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const pages = {
    home: <Home onNavigate={navigate} />,
    submit: <SubmitProposal walletAddress={walletAddress} />,
    dashboard: <Dashboard onNavigate={navigate} />,
    details: (
      <ProposalDetails
        proposalId={activeProposalId}
        onNavigate={navigate}
        onSelectProposal={setActiveProposalId}
      />
    ),
    leaderboard: <Leaderboard />,
  }

  return (
    <AppLayout
      activePage={activePage}
      onConnectWallet={() => setWalletAddress(MOCK_WALLET_ADDRESS)}
      onNavigate={navigate}
      walletAddress={walletAddress}
    >
      {pages[activePage]}
    </AppLayout>
  )
}

export default App
