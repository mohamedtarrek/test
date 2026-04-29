import { WalletAdapterNetwork, WalletError } from '@solana/wallet-adapter-base';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { UnsafeBurnerWalletAdapter } from '@solana/wallet-adapter-unsafe-burner';
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

// ONLY use official Solana Devnet RPC - no fallback to other networks
const DEVNET_ENDPOINT = 'https://api.devnet.solana.com';

const WalletContextProvider: FC<{ children: ReactNode }> = ({ children }) => {
    const { autoConnect } = useAutoConnect();
    const { networkConfiguration } = useNetworkConfiguration();

    // Force Devnet only - ignore any other network configuration
    const endpoint = useMemo(() => {
      if (networkConfiguration !== WalletAdapterNetwork.Devnet) {
        console.warn(`Invalid network "${networkConfiguration}". Forcing Devnet.`);
      }
      return DEVNET_ENDPOINT;
    }, []);

    const wallets = useMemo(
        () => [
            new UnsafeBurnerWalletAdapter(),
        ],
        []
    );

    const onError = useCallback(
        (error: WalletError) => {
            notify({ type: 'error', message: error.message ? `${error.name}: ${error.message}` : error.name });
            console.error(error);
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