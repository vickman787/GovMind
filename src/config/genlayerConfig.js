const env = import.meta.env
const hasContract = !!env.VITE_GENLAYER_CONTRACT_ADDRESS

export const genlayerConfig = {
  mockMode: env.VITE_MOCK_MODE === 'true' || !hasContract,
  contractAddress: env.VITE_GENLAYER_CONTRACT_ADDRESS ?? '',
  rpcUrl: env.VITE_GENLAYER_RPC_URL ?? '',
}

