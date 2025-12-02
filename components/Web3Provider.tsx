import React from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, getDefaultConfig, darkTheme } from '@rainbow-me/rainbowkit';
import { sepolia } from 'wagmi/chains';
import '@rainbow-me/rainbowkit/styles.css';

const config = getDefaultConfig({
  appName: 'TripX',
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
  chains: [sepolia],
  ssr: false,
});

const queryClient = new QueryClient();

export const Web3Provider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme({
          accentColor: '#ffffff',
          accentColorForeground: '#000000',
          borderRadius: 'large',
          overlayBlur: 'small',
        })}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};
