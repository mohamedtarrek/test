import { WalletAdapterNetwork, WalletError } from '@solana/wallet-adapter-base';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare';
import { clusterApiUrl } from '@solana/web3.js';
import { FC, ReactNode, useCallback, useMemo } from 'react';
import { AutoConnectProvider, useAutoConnect } from './AutoConnectProvider';
import { notify } from "../utils/notifications";
import { NetworkConfigurationProvider } from './NetworkConfigurationProvider';
import dynamic from "next/dynamic";

const ReactUIWalletModalProviderDynamic = dynamic(
  async () =>
    (await import("@solana/wallet-adapter-react-ui")).WalletModalProvider,
  { ssr: false }
);

// Phantom deep link for mobile browsers
const PHANTOM_DEEP_LINK = 'https://phantom.app/ul/browse/';

interface PhantomWindow extends Window {
    phantom?: {
        solana?: {
            isPhantom?: boolean;
        };
    };
    solana?: {
        isPhantom?: boolean;
    };
}

function isPhantomInstalled(): boolean {
    if (typeof window === 'undefined') return false;
    const win = window as PhantomWindow;
    return !!(win.phantom?.solana?.isPhantom || win.solana?.isPhantom);
}

const WalletContextProvider: FC<{ children: ReactNode }> = ({ children }) => {
    const { autoConnect } = useAutoConnect();

    // Force Devnet only
    const endpoint = useMemo(() => clusterApiUrl(WalletAdapterNetwork.Devnet), []);

    // Real wallet adapters
    const wallets = useMemo(() => {
        return [
            new PhantomWalletAdapter(),
            new SolflareWalletAdapter(),
        ];
    }, []);

    const onError = useCallback(
        (error: WalletError) => {
            console.error('Wallet error:', error);
            // Don't spam notifications for WalletNotReadyError
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

// Export for use in components
export { PHANTOM_DEEP_LINK, isPhantomInstalled };