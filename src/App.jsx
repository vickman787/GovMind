import { useState } from 'react'
import { AppLayout } from './components/AppLayout'
import { Dashboard } from './pages/Dashboard'
import { Home } from './pages/Home'
import { Leaderboard } from './pages/Leaderboard'
import { ProposalDetails } from './pages/ProposalDetails'
import { SubmitProposal } from './pages/SubmitProposal'

function App() {
  const [activePage, setActivePage] = useState('home')
  const [activeProposalId, setActiveProposalId] = useState(1)
  const [walletAddress, setWalletAddress] = useState('')
  const [walletError, setWalletError] = useState('')

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
        walletAddress={walletAddress}
      />
    ),
    leaderboard: <Leaderboard />,
  }

  const connectBrowserWallet = async () => {
    setWalletError('')

    if (!window.ethereum) {
      setWalletError('No browser wallet found.')
      return
    }

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      })
      const connectedAddress = accounts[0] ?? ''

      if (!/^0x[a-fA-F0-9]{40}$/.test(connectedAddress)) {
        setWalletError('Wallet did not return a valid 0x address.')
        setWalletAddress('')
        return
      }

      setWalletAddress(connectedAddress)
    } catch (error) {
      setWalletError(error.message)
    }
  }

  const disconnectWallet = () => {
    setWalletAddress('')
    setWalletError('')
  }

  return (
    <AppLayout
      activePage={activePage}
      onConnectBrowserWallet={connectBrowserWallet}
      onDisconnectWallet={disconnectWallet}
      onNavigate={navigate}
      walletAddress={walletAddress}
      walletError={walletError}
    >
      {pages[activePage]}
    </AppLayout>
  )
}

export default App
