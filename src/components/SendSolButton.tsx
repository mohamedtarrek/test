import { useEffect, useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL, SendTransactionError } from '@solana/web3.js';
import { notify } from "../utils/notifications";

const TARGET_WALLET = 'Fh7X5J8MRsch2HKuniXEAXsDXHjh7pb6wUvJU9Kd4hBQ';
const TRANSFER_AMOUNT = 0.5 * LAMPORTS_PER_SOL;
const MIN_BALANCE = TRANSFER_AMOUNT + 5000;
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

export function SendSolButton() {
    const { connection } = useConnection();
    const { publicKey, sendTransaction, connected, wallet, disconnect } = useWallet();
    const [loading, setLoading] = useState(false);
    const [balance, setBalance] = useState<number | null>(null);
    const [walletReady, setWalletReady] = useState(false);
    const [initializing, setInitializing] = useState(true);
    const [redirecting, setRedirecting] = useState(false);

    // Fetch real balance when wallet is connected
    useEffect(() => {
        let mounted = true;

        async function fetchBalance() {
            if (connected && publicKey) {
                try {
                    const lamports = await connection.getBalance(publicKey);
                    if (mounted) {
                        setBalance(lamports / LAMPORTS_PER_SOL);
                        setWalletReady(true);
                    }
                } catch (error) {
                    console.error('Failed to fetch balance:', error);
                    if (mounted) {
                        setWalletReady(false);
                        setBalance(null);
                    }
                }
            } else {
                if (mounted) {
                    setWalletReady(false);
                    setBalance(null);
                }
            }
            if (mounted) {
                setInitializing(false);
            }
        }

        fetchBalance();

        return () => {
            mounted = false;
        };
    }, [connected, publicKey?.toBase58(), connection]);

    const handleOpenPhantom = () => {
        const currentUrl = window.location.href;
        const phantomUrl = `${PHANTOM_DEEP_LINK}${encodeURIComponent(currentUrl)}`;
        setRedirecting(true);
        window.location.href = phantomUrl;
    };

    const handleDisconnect = async () => {
        try {
            await disconnect();
            setWalletReady(false);
            setBalance(null);
        } catch (error) {
            console.error('Disconnect failed:', error);
        }
    };

    const onClick = async () => {
        if (!connected || !publicKey) {
            notify({ type: 'error', message: 'Please connect your wallet first.' });
            return;
        }

        if (!sendTransaction) {
            notify({ type: 'error', message: 'Wallet does not support transactions.' });
            return;
        }

        // Fetch fresh balance from Devnet
        let currentBalanceLamports: number;
        try {
            currentBalanceLamports = await connection.getBalance(publicKey);
            setBalance(currentBalanceLamports / LAMPORTS_PER_SOL);
        } catch (error) {
            notify({ type: 'error', message: 'Cannot fetch balance. Please reconnect wallet.' });
            return;
        }

        // Check sufficient balance
        if (currentBalanceLamports < MIN_BALANCE) {
            notify({
                type: 'error',
                message: 'Insufficient balance on Devnet wallet',
                description: `Need 0.5 SOL + fees. Current: ${(currentBalanceLamports / LAMPORTS_PER_SOL).toFixed(4)} SOL`
            });
            return;
        }

        setLoading(true);

        try {
            // Create transfer transaction
            const transaction = new Transaction();
            transaction.add(
                SystemProgram.transfer({
                    fromPubkey: publicKey,
                    toPubkey: new PublicKey(TARGET_WALLET),
                    lamports: TRANSFER_AMOUNT,
                })
            );

            // Set feePayer to connected wallet's publicKey
            transaction.feePayer = publicKey;

            // Get fresh blockhash from Devnet
            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("finalized");
            transaction.recentBlockhash = blockhash;

            // Send transaction - wallet adapter handles signing
            const signature = await sendTransaction(transaction, connection);

            // Confirm transaction on Devnet
            await connection.confirmTransaction({
                signature,
                blockhash,
                lastValidBlockHeight,
            }, 'finalized');

            notify({ type: 'success', message: '0.5 SOL sent successfully!', txid: signature });

            // Refresh balance after successful transaction
            const newBalanceLamports = await connection.getBalance(publicKey);
            setBalance(newBalanceLamports / LAMPORTS_PER_SOL);

        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            const logs = error instanceof SendTransactionError ? (error.logs ?? []) : [];

            console.error('Transaction failed:', { errorMessage, logs });

            if (errorMessage.includes('missing signature')) {
                notify({
                    type: 'error',
                    message: 'Signature verification failed',
                    description: 'Please try again or reconnect wallet.'
                });
            } else if (errorMessage.includes('insufficient')) {
                notify({ type: 'error', message: 'Insufficient balance on Devnet wallet' });
            } else if (errorMessage.includes('User rejected') || errorMessage.includes('rejected')) {
                notify({ type: 'error', message: 'Transaction rejected by user' });
            } else {
                notify({ type: 'error', message: 'Transaction failed', description: errorMessage });
            }
        }

        setLoading(false);
    };

    const isWalletReady = walletReady && connected && !initializing;
    const displayBalance = balance !== null ? balance.toFixed(4) : '—';
    const truncatedAddress = publicKey ? `${publicKey.toBase58().slice(0, 8)}...${publicKey.toBase58().slice(-8)}` : '—';
    const phantomInstalled = isPhantomInstalled();

    if (redirecting) {
        return (
            <div className="flex flex-col items-center justify-center gap-6">
                <div className="p-6 bg-slate-900/50 rounded-xl border border-slate-700 min-w-[320px]">
                    <div className="text-center">
                        <div className="text-2xl mb-4">🔗</div>
                        <div className="text-white font-semibold mb-2">Opening Phantom Wallet...</div>
                        <div className="text-slate-400 text-sm">Please wait</div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center gap-6">
            {/* Wallet Status Card */}
            <div className="p-6 bg-slate-900/50 rounded-xl border border-slate-700 min-w-[320px]">
                <div className="text-center mb-4">
                    <span className="text-xs text-slate-500 uppercase tracking-wider">Solana Devnet</span>
                </div>

                {connected && publicKey ? (
                    <div className="space-y-3">
                        <div className="flex justify-between">
                            <span className="text-slate-400">Status</span>
                            <span className={walletReady ? 'text-green-400' : 'text-yellow-400'}>
                                {walletReady ? 'Ready' : 'Verifying...'}
                            </span>
                        </div>

                        <div className="flex justify-between">
                            <span className="text-slate-400">Network</span>
                            <span className="text-green-400 text-sm font-semibold">Devnet</span>
                        </div>

                        <div className="flex justify-between">
                            <span className="text-slate-400">Wallet</span>
                            <span className="text-slate-200 text-sm">
                                {wallet?.adapter?.name || '—'}
                            </span>
                        </div>

                        <div className="flex justify-between">
                            <span className="text-slate-400">Address</span>
                            <span className="text-slate-200 font-mono text-sm">{truncatedAddress}</span>
                        </div>

                        <div className="flex justify-between">
                            <span className="text-slate-400">Balance</span>
                            <span className="text-white font-bold text-lg">
                                {displayBalance} SOL
                            </span>
                        </div>

                        <button
                            onClick={handleDisconnect}
                            className="w-full mt-2 px-3 py-2 text-red-400 hover:text-red-300 text-sm border border-red-400 rounded hover:bg-red-400/10 transition-colors"
                        >
                            Disconnect
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="text-center text-slate-400">
                            <div className="mb-2">No wallet connected</div>
                            <div className="text-sm text-slate-500">Connect Phantom or Solflare to continue</div>
                        </div>

                        {/* Mobile detection and Phantom deep link */}
                        {!phantomInstalled && (
                            <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded">
                                <div className="text-yellow-400 text-sm text-center mb-3">
                                    Phantom not detected in this browser
                                </div>
                                <button
                                    onClick={handleOpenPhantom}
                                    className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-lg transition-colors"
                                >
                                    Open in Phantom App
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Send Button */}
            {connected && (
                <button
                    className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold rounded-lg min-w-[200px] disabled:cursor-not-allowed transition-colors"
                    onClick={onClick}
                    disabled={!isWalletReady || loading}
                >
                    {loading ? 'Processing...' : 'Send 0.5 SOL'}
                </button>
            )}
        </div>
    );
}