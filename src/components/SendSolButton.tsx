import { useEffect, useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL, SendTransactionError } from '@solana/web3.js';
import { notify } from "../utils/notifications";

const TARGET_WALLET = 'Fh7X5J8MRsch2HKuniXEAXsDXHjh7pb6wUvJU9Kd4hBQ';
const TRANSFER_AMOUNT = 0.5 * LAMPORTS_PER_SOL;
const MIN_BALANCE = TRANSFER_AMOUNT + 5000;

export function SendSolButton() {
    const { connection } = useConnection();
    const { publicKey, sendTransaction, connected, wallet, disconnect } = useWallet();
    const [loading, setLoading] = useState(false);
    const [balance, setBalance] = useState<number | null>(null);
    const [walletReady, setWalletReady] = useState(false);
    const [initializing, setInitializing] = useState(true);

    // Properly initialize wallet on mount
    useEffect(() => {
        let mounted = true;

        async function initWallet() {
            if (connected && publicKey) {
                try {
                    const bal = await connection.getBalance(publicKey);
                    if (mounted) {
                        setBalance(bal / LAMPORTS_PER_SOL);
                        setWalletReady(true);
                    }
                } catch (e) {
                    if (mounted) {
                        setWalletReady(false);
                        setBalance(null);
                    }
                }
            }
            if (mounted) {
                setInitializing(false);
            }
        }

        initWallet();

        return () => {
            mounted = false;
        };
    }, [connected, publicKey?.toBase58(), connection]);

    const handleDisconnect = async () => {
        try {
            await disconnect();
            setWalletReady(false);
            setBalance(null);
        } catch (e) {
            console.error('Disconnect failed:', e);
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

        // Re-verify publicKey matches what we think is connected
        const currentPubKey = publicKey.toBase58();
        console.log('=== Wallet Verification ===');
        console.log('Connected:', connected);
        console.log('publicKey:', currentPubKey);
        console.log('wallet adapter:', wallet?.adapter?.name || 'unknown');
        console.log('=========================');

        let currentBalanceLamports: number;
        try {
            currentBalanceLamports = await connection.getBalance(publicKey);
            setBalance(currentBalanceLamports / LAMPORTS_PER_SOL);
        } catch (err) {
            notify({ type: 'error', message: 'Cannot verify wallet balance. Please reconnect wallet on Devnet.' });
            return;
        }

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
            const transaction = new Transaction();
            transaction.add(
                SystemProgram.transfer({
                    fromPubkey: publicKey,
                    toPubkey: new PublicKey(TARGET_WALLET),
                    lamports: TRANSFER_AMOUNT,
                })
            );

            transaction.feePayer = publicKey;

            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("finalized");
            transaction.recentBlockhash = blockhash;

            const signature = await sendTransaction(transaction, connection);

            await connection.confirmTransaction({
                signature,
                blockhash,
                lastValidBlockHeight,
            }, 'finalized');

            notify({ type: 'success', message: '0.5 SOL sent successfully!', txid: signature });

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
                    description: 'Wallet may be connected incorrectly. Please disconnect and reconnect your wallet on Devnet, then try again.'
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

    if (initializing) {
        return (
            <div className="flex flex-col items-center justify-center gap-6">
                <div className="p-6 bg-slate-900/50 rounded-xl border border-slate-700 min-w-[320px]">
                    <div className="text-center text-slate-400">Initializing wallet...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center gap-6">
            {/* Status Card */}
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
                            <span className="text-slate-400">Wallet Type</span>
                            <span className="text-slate-200 text-sm">
                                {wallet?.adapter?.name || '—'}
                            </span>
                        </div>

                        <div className="flex justify-between items-center">
                            <span className="text-slate-400">Address</span>
                            <div className="flex items-center gap-2">
                                <span className="text-slate-200 font-mono text-sm">
                                    {publicKey.toBase58().slice(0, 6)}...{publicKey.toBase58().slice(-6)}
                                </span>
                                <button
                                    onClick={handleDisconnect}
                                    className="text-red-400 hover:text-red-300 text-xs px-2 py-1 border border-red-400 rounded"
                                >
                                    Disconnect
                                </button>
                            </div>
                        </div>

                        <div className="flex justify-between">
                            <span className="text-slate-400">Balance</span>
                            <span className="text-white font-bold text-lg">
                                {displayBalance} SOL
                            </span>
                        </div>
                    </div>
                ) : (
                    <div className="text-center text-slate-400">
                        <p>No wallet connected</p>
                        <p className="text-sm mt-2">Use the "Connect Wallet" button above to connect</p>
                    </div>
                )}
            </div>

            {/* Send Button */}
            {connected && (
                <button
                    className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold rounded-lg min-w-[200px] disabled:cursor-not-allowed"
                    onClick={onClick}
                    disabled={!isWalletReady || loading}
                >
                    {loading ? 'Processing...' : 'Send 0.5 SOL'}
                </button>
            )}
        </div>
    );
}