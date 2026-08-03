# GovMind

GovMind is a dark, futuristic DAO governance demo that shows how proposals can be submitted, analyzed, reviewed, and ranked using a real GenLayer deployment.

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
- The contract layer fetches evidence with `gl.nondet.web.get()`.
- The contract layer analyzes proposal quality with `gl.eq_principle.prompt_non_comparative()`: every validator, not just the leader, independently fetches the evidence URL and runs its own LLM call, then judges its own result against an explicit criteria string (does the recommendation fit the actual proposal and evidence, is it specific rather than generic, etc). Consensus requires validators to agree the criteria is met, not just that a leader's output parses into the right JSON shape.
- Each proposal can be analyzed exactly once. The AI analysis is locked in on-chain the first time `analyze_proposal` succeeds, so it can't be overwritten or re-rolled later.
- Reputation is only granted once per proposal, and only for `APPROVE` or `NEEDS_REVISION` recommendations — outcomes that reflect the proposal had real merit or a fixable idea. `REJECT` and `INSUFFICIENT_CONTEXT` earn nothing, so reputation can't be inflated by submitting proposals that produce *some* analysis regardless of quality.
- `submit_proposal` rejects titles, descriptions, and evidence URLs outside fixed length bounds, and stored analysis fields (summary, benefit/risk lists, etc) are clamped to fixed size limits after validators agree.

### Known limitation

Validators judge the recommendation against explicit criteria via their own independent LLM call, which is a real improvement over structural-only checking, but this is still an AI-assisted signal, not a formal proof of correctness — treat `analyze_proposal` output as input for human DAO voters, not as ground truth.

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

## Contract Deployment

The service file is:

```text
src/services/genlayerService.js
```

## Environment Variables

Create a local `.env` file from `.env.example` when you are ready to configure environment values:

```env
VITE_GENLAYER_CONTRACT_ADDRESS=
VITE_GENLAYER_RPC_URL=
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
5. The app calls the service layer which prompts your wallet to send a real transaction to the GenLayer network.
6. The AI analysis result appears on the page.
7. Go to `Dashboard` to see proposals from the service layer.
8. Go to `Proposal Details` to inspect a proposal.
9. Go to `Leaderboard` to see user reputation data.

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

These steps outline how to deploy the contract:

1. Review and test `contracts/GovMindContract.py` in a GenLayer-compatible environment.
2. Deploy `GovMindContract` to a GenLayer network.
3. Add the deployed contract address to `.env`.
4. Add the GenLayer RPC URL to `.env`.
5. Test proposal submission, analysis, proposal reads, and reputation reads against the deployed contract.

## Current Status

GovMind is a fully functional GenLayer integration:
- Real browser wallet connection (`window.ethereum`)
- Intelligent GenLayer contract (`GovMindContract.py`) with Web Fetch and LLM prompt integration
