/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_MAPS_API_KEY: string
  readonly VITE_GOOGLE_MAPS_KEY: string
  readonly VITE_MAPBOX_TOKEN: string
  readonly VITE_MAPBOX_ACCESS_TOKEN: string
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_GOOGLE_AI_KEY: string
  readonly VITE_OPENROUTER_API_KEY: string
  readonly VITE_WALLETCONNECT_PROJECT_ID: string
  readonly VITE_TPX_CONTRACT_ADDRESS: string
  readonly VITE_NFT_PASSPORT_CONTRACT_ADDRESS: string
  readonly VITE_ADMIN_WALLET_ADDRESS: string
  readonly VITE_ADMIN_WALLET_PRIVATE_KEY: string
  readonly VITE_BASE_SEPOLIA_RPC_URL: string
  readonly VITE_API_BASE_URL: string
  readonly VITE_SEPOLIA_RPC_URL: string
  readonly ADMIN_WALLET_PRIVATE_KEY: string
  readonly API_BASE_URL: string
  readonly BASE_SEPOLIA_RPC_URL: string
  readonly SEPOLIA_RPC_URL: string
  readonly API_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
