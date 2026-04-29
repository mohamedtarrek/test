import { WalletAdapterNetwork, WalletError } from '@solana/wallet-adapter-base';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare';
import { clusterApiUrl } from '@solana/web3.js';
import { FC, ReactNode, useCallback, useMemo } from 'react';
import { AutoConnectProvider, useAutoConnect } from './AutoConnectProvider';
import { notify } from "../utils/notifications";
import { NetworkConfigurationProvider, useNetworkConfiguration } from './NetworkConfigurationProvider';
import dynamic from "next/dynamic";

const ReactUIWalletModalProviderDynamic = dynamic(
  async () =>
    (await import("@solana/wallet-adapter-react-ui")).WalletModalProvider,
  { ssr: false }
);

// Check if running on mobile iOS
function isIosDevice(): boolean {
    if (typeof window === 'undefined') return false;
    return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

// Get the correct Phantom adapter for the environment
function getPhantomAdapter(): PhantomWalletAdapter {
    const adapter = new PhantomWalletAdapter();
    return adapter;
}

const WalletContextProvider: FC<{ children: ReactNode }> = ({ children }) => {
    const { autoConnect } = useAutoConnect();

    // Force Devnet only using clusterApiUrl
    const endpoint = useMemo(() => clusterApiUrl(WalletAdapterNetwork.Devnet), []);

    // Real wallet adapters - Phantom and Solflare
    // Only include adapters that are supported in the current environment
    const wallets = useMemo(() => {
        const adapters = [];

        // Always add Phantom
        adapters.push(getPhantomAdapter());

        // Add Solflare
        adapters.push(new SolflareWalletAdapter());

        return adapters;
    }, []);

    const onError = useCallback(
        (error: WalletError) => {
            console.error('Wallet error:', error);
            // Don't show notification for WalletNotReadyError - it's handled gracefully
            if (error.name !== 'WalletNotReadyError') {
                notify({ type: 'error', message: error.message || error.name });
            }
        },
        []
    );

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} onError={onError} autoConnect={autoConnect}>
                <ReactUIWalletModalProviderDynamic>
                    {children}
                </ReactUIWalletModalProviderDynamic>
			</WalletProvider>
        </ConnectionProvider>
    );
};

export const ContextProvider: FC<{ children: ReactNode }> = ({ children }) => {
    return (
        <>
            <NetworkConfigurationProvider>
                <AutoConnectProvider>
                    <WalletContextProvider>{children}</WalletContextProvider>
                </AutoConnectProvider>
            </NetworkConfigurationProvider>
        </>
    );
};