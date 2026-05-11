const env = import.meta.env

export const genlayerConfig = {
  mockMode: env.VITE_MOCK_MODE !== 'false',
  contractAddress: env.VITE_GENLAYER_CONTRACT_ADDRESS ?? '',
  rpcUrl: env.VITE_GENLAYER_RPC_URL ?? '',
}

