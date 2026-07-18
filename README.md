# GovMind

GovMind is a dark, futuristic DAO governance demo that shows how proposals can be submitted, analyzed, reviewed, and ranked before connecting to a real GenLayer deployment.

The current app runs in mock mode by default. It does not require a wallet, backend, deployed contract, or real GenLayer RPC connection to try the demo.

## Problem It Solves

DAO voters often need to review proposals that are long, unclear, risky, or missing supporting evidence. GovMind explores a workflow where an AI-assisted governance layer can help voters understand:

- Whether a proposal has enough context
- What benefits and risks it introduces
- Whether the treasury impact looks reasonable
- Whether the proposal may need revision before a vote
- How contributor reputation could appear in a governance dashboard

## Why GenLayer

GenLayer is designed for intelligent contracts that can use AI and web data as part of contract logic. GovMind is structured around that idea:

- Proposals can include an evidence URL.
- The contract layer is prepared to fetch evidence with `gl.nondet.web.get()`.
- The contract layer is prepared to analyze proposal quality with `gl.nondet.exec_prompt()`.
- The frontend is already separated through a service layer so mock data can later be replaced with real GenLayer contract calls.

## Main Features

- Home page with DAO overview
- Submit Proposal page with browser wallet connect support
- AI analysis result after proposal submission
- Dashboard that reads proposals from the service layer
- Proposal Details page that reads one proposal from the service layer
- Leaderboard that reads user reputation
- Real browser wallet connection via `window.ethereum`
- GenLayer service fully integrated with `genlayer-js`
- Beginner-friendly contract draft in `contracts/GovMindContract.py`

## Tech Stack

- React
- Vite
- TailwindCSS
- JavaScript
- Python intelligent contract draft
- Mock GenLayer service layer

## Folder Structure

```text
govmind/
  contracts/
    GovMindContract.py
  public/
  src/
    components/
      AppLayout.jsx
    config/
      genlayerConfig.js
    pages/
      Dashboard.jsx
      Home.jsx
      Leaderboard.jsx
      ProposalDetails.jsx
      SubmitProposal.jsx
    services/
      genlayerService.js
    App.jsx
    index.css
    main.jsx
  .env.example
  package.json
  README.md
```

## Install Dependencies

From the project folder:

```bash
npm install
```

## Run Locally

```bash
npm run dev
```

Then open the URL shown in your terminal. It is usually:

```text
http://127.0.0.1:5173
```

## Mock vs Live Mode

GovMind uses mock mode by default so the app works immediately without deploying a contract.

Mock mode is automatically enabled if no contract address is provided.
When mock mode is on:

- Proposal submissions are stored in temporary frontend JavaScript memory.
- AI analysis returns instantly from mock data (bypassing the real contract).
- No real GenLayer network calls are made.
- No backend is required.

When you are ready to use Live Mode:
1. Deploy `GovMindContract.py` to GenLayer.
2. Add the deployed contract address to `.env`.
3. The app will automatically switch to Live Mode, routing all reads and writes to the real contract.

The service file is:

```text
src/services/genlayerService.js
```

## Environment Variables

Create a local `.env` file from `.env.example` when you are ready to configure environment values:

```env
VITE_MOCK_MODE=true
VITE_GENLAYER_CONTRACT_ADDRESS=
VITE_GENLAYER_RPC_URL=
```

For now, keep:

```env
VITE_MOCK_MODE=true
```

Later, the real deployed GenLayer contract address will go here:

```env
VITE_GENLAYER_CONTRACT_ADDRESS=your_contract_address_here
```

The GenLayer RPC URL will go here:

```env
VITE_GENLAYER_RPC_URL=your_rpc_url_here
```

## How The Demo Works

1. Click `Connect Wallet` to connect your browser extension wallet (e.g. MetaMask).
2. Go to `Submit Proposal`.
3. Fill in the proposal form.
4. Submit the proposal.
5. The app calls the service layer:
   - In Mock Mode: returns instantly with canned data.
   - In Live Mode: Prompts your wallet to send a real transaction to the GenLayer network.
6. The AI analysis result appears on the page.
8. Go to `Dashboard` to see proposals from the service layer.
9. Go to `Proposal Details` to inspect a proposal.
10. Go to `Leaderboard` to see mock reputation data.

## Available Scripts

```bash
npm run dev
```

Starts the local development server.

```bash
npm run build
```

Creates a production build.

```bash
npm run lint
```

Runs ESLint.

```bash
npm run preview
```

Serves the production build locally.

## Future GenLayer Deployment Steps

These steps are not implemented yet, but the project is prepared for them:

1. Review and test `contracts/GovMindContract.py` in a GenLayer-compatible environment.
2. Deploy `GovMindContract` to a GenLayer network.
3. Add the deployed contract address to `.env`.
4. Add the GenLayer RPC URL to `.env`.
5. Set mock mode off:

```env
VITE_MOCK_MODE=false
```

6. Replace the placeholder sections in `src/services/genlayerService.js` with real `genlayer-js` calls.
7. Add real wallet connection.
8. Test proposal submission, analysis, proposal reads, and reputation reads against the deployed contract.

## Current Status

GovMind includes both a frontend demo and a fully functional GenLayer integration:
- Real browser wallet connection (`window.ethereum`)
- Intelligent GenLayer contract (`GovMindContract.py`) with Web Fetch and LLM prompt integration
- Automatic fallback to mock data when no contract is deployed
