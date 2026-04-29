'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useCallback, useMemo } from 'react';

export type WalletStatusType = 'disconnected' | 'connecting' | 'connected';

interface UseWalletStatusReturn {
  status: WalletStatusType;
  connecting: boolean;
  connected: boolean;
  walletName: string | null;
  walletIcon: string | null;
  truncatedAddress: string | null;
}

export function useWalletStatus(): UseWalletStatusReturn {
  const { wallet, publicKey, connecting, connected } = useWallet();

  const truncatedAddress = useMemo(() => {
    if (!publicKey) return null;
    const base58 = publicKey.toBase58();
    return `${base58.slice(0, 4)}...${base58.slice(-4)}`;
  }, [publicKey]);

  return {
    status: connected
      ? 'connected'
      : connecting
        ? 'connecting'
        : 'disconnected',
    connecting,
    connected,
    walletName: wallet?.adapter?.name ?? null,
    walletIcon: wallet?.adapter?.icon ?? null,
    truncatedAddress,
  };
}