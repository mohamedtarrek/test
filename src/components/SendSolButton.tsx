'use client';

import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { SystemProgram, Transaction, PublicKey, LAMPORTS_PER_SOL, SendTransactionError } from '@solana/web3.js';
import { FC, useState, useCallback } from 'react';
import { notify } from "../utils/notifications";

// Target wallet for the demo transfer
const TARGET_WALLET = new PublicKey('Fh7X5J8MRsch2HKuniXEAXsDXHjh7pb6wUvJU9Kd4hBQ');
const TRANSFER_AMOUNT_SOL = 0.5;
const TRANSFER_AMOUNT_LAMPORTS = TRANSFER_AMOUNT_SOL * LAMPORTS_PER_SOL;

// Transaction states for UI feedback
type TxState = 'idle' | 'checking_wallet' | 'preparing' | 'waiting_approval' | 'confirming' | 'confirmed' | 'failed';

interface SendSolButtonProps {
    className?: string;
}

// Animated glowing button with 2026 design
const NeonButton: FC<{
    onClick: () => void;
    disabled: boolean;
    loading: boolean;
    children: React.ReactNode;
}> = ({ onClick, disabled, loading, children }) => {
    const [isHovered, setIsHovered] = useState(false);
    const [isPressed, setIsPressed] = useState(false);

    return (
        <div className="relative group inline-flex">
            {/* Outer glow layer */}
            <div className={`
                absolute -inset-1 rounded-2xl
                bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-500
                blur-lg opacity-40 group-hover:opacity-70
                transition-all duration-500 ease-out
                ${loading ? 'animate-pulse opacity-60' : ''}
                ${isHovered && !disabled ? 'scale-105' : ''}
            `} />

            {/* Second glow layer */}
            <div className={`
                absolute -inset-0.5 rounded-2xl
                bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-600
                blur-md opacity-20 group-hover:opacity-40
                transition-all duration-300
                ${isHovered && !disabled ? 'scale-102' : ''}
            `} />

            {/* Button */}
            <button
                onClick={onClick}
                disabled={disabled || loading}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => { setIsHovered(false); setIsPressed(false); }}
                onMouseDown={() => setIsPressed(true)}
                onMouseUp={() => setIsPressed(false)}
                className={`
                    relative px-10 py-4 rounded-2xl
                    bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-600
                    text-white font-semibold text-base
                    shadow-[0_0_30px_rgba(139,92,246,0.3)]
                    transition-all duration-200 ease-out
                    disabled:opacity-50 disabled:cursor-not-allowed
                    hover:shadow-[0_0_40px_rgba(139,92,246,0.5)]
                    active:scale-95
                    ${isHovered && !disabled ? 'scale-102' : ''}
                    ${loading ? 'animate-pulse' : ''}
                `}
            >
                {/* Shimmer effect */}
                <div className={`
                    absolute inset-0 rounded-2xl
                    bg-gradient-to-r from-transparent via-white/20 to-transparent
                    -translate-x-full group-hover:translate-x-full
                    transition-transform duration-1000 ease-out
                    ${isHovered ? 'animate-shimmer' : ''}
                `} />

                {/* Content */}
                <span className="relative z-10 flex items-center gap-3">
                    {loading ? (
                        <>
                            <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />
                                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                            </svg>
                            Processing...
                        </>
                    ) : children}
                </span>
            </button>
        </div>
    );
};

// Status indicator pill
const StatusPill: FC<{ state: TxState }> = ({ state }) => {
    const config: Record<TxState, { label: string; className: string; icon: React.ReactNode }> = {
        idle: { label: 'Ready', className: 'bg-slate-500/20 text-slate-400', icon: null },
        checking_wallet: { label: 'Connecting wallet...', className: 'bg-amber-500/20 text-amber-400 animate-pulse', icon: '⏳' },
        preparing: { label: 'Preparing...', className: 'bg-amber-500/20 text-amber-400 animate-pulse', icon: '⏳' },
        waiting_approval: { label: 'Waiting for approval...', className: 'bg-violet-500/20 text-violet-400 animate-pulse', icon: '📱' },
        confirming: { label: 'Confirming...', className: 'bg-cyan-500/20 text-cyan-400 animate-pulse', icon: '🔄' },
        confirmed: { label: 'Transaction confirmed', className: 'bg-green-500/20 text-green-400', icon: '✓' },
        failed: { label: 'Transaction failed', className: 'bg-red-500/20 text-red-400', icon: '✗' },
    };

    const { label, className, icon } = config[state];

    return (
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${className} transition-all duration-300`}>
            {icon && <span>{icon}</span>}
            <span className="text-sm font-medium">{label}</span>
        </div>
    );
};

export const SendSolButton: FC<SendSolButtonProps> = ({ className = '' }) => {
    const { connection } = useConnection();
    const { publicKey, sendTransaction, connected } = useWallet();

    const [txState, setTxState] = useState<TxState>('idle');
    const [balance, setBalance] = useState<number | null>(null);
    const [lastSignature, setLastSignature] = useState<string | null>(null);

    // Get current balance
    const getBalance = useCallback(async (): Promise<number | null> => {
        if (!publicKey) return null;
        try {
            const lamports = await connection.getBalance(publicKey);
            return lamports / LAMPORTS_PER_SOL;
        } catch {
            return null;
        }
    }, [publicKey, connection]);

    // Check if wallet is connected and has sufficient balance
    const checkWalletReady = useCallback(async (): Promise<{ ready: boolean; balance: number | null; error?: string }> => {
        if (!connected || !publicKey) {
            return { ready: false, balance: null, error: 'Wallet not connected' };
        }

        setTxState('checking_wallet');
        const currentBalance = await getBalance();

        if (currentBalance === null) {
            return { ready: false, balance: null, error: 'Could not fetch balance' };
        }

        if (currentBalance < TRANSFER_AMOUNT_SOL) {
            return {
                ready: false,
                balance: currentBalance,
                error: `Insufficient balance. Need ${TRANSFER_AMOUNT_SOL} SOL`,
            };
        }

        return { ready: true, balance: currentBalance };
    }, [connected, publicKey, getBalance]);

    // Handle button click - triggers wallet confirmation flow
    const handleClick = useCallback(async () => {
        if (!connected || !publicKey || !sendTransaction) {
            notify({ type: 'error', message: 'Please connect your wallet first' });
            setTxState('failed');
            setTimeout(() => setTxState('idle'), 3000);
            return;
        }

        // Reset state
        setLastSignature(null);
        setTxState('checking_wallet');

        // Check wallet ready state
        const { ready, balance: currentBalance, error } = await checkWalletReady();

        if (!ready) {
            notify({ type: 'error', message: error || 'Wallet not ready' });
            setTxState('failed');
            setTimeout(() => setTxState('idle'), 3000);
            return;
        }

        // Update balance display
        setBalance(currentBalance);

        // Check if enough remaining after transfer
        if (currentBalance! < TRANSFER_AMOUNT_SOL + 0.01) {
            notify({
                type: 'warning',
                message: 'Low balance warning',
                description: 'Keep some SOL for transaction fees',
            });
        }

        setTxState('preparing');

        try {
            // CRITICAL FIX: Get latest blockhash with 'finalized' commitment for mobile stability
            const latestBlockhash = await connection.getLatestBlockhash('finalized');

            // CRITICAL FIX: Use new Transaction constructor with blockhash and lastValidBlockHeight
            // This prevents stale blockhash issues on mobile wallets like Phantom
            const transaction = new Transaction({
                feePayer: publicKey,
                blockhash: latestBlockhash.blockhash,
                lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
            }).add(
                SystemProgram.transfer({
                    fromPubkey: publicKey,
                    toPubkey: TARGET_WALLET,
                    lamports: TRANSFER_AMOUNT_LAMPORTS,
                })
            );

            // CRITICAL FIX: Small delay before sending to allow Phantom mobile to initialize
            await new Promise(resolve => setTimeout(resolve, 250));

            setTxState('waiting_approval');

            // CRITICAL FIX: Use 'processed' preflight commitment for better mobile compatibility
            const signature = await sendTransaction(transaction, connection, {
                skipPreflight: false,
                preflightCommitment: 'processed',
                maxRetries: 5,
            });

            setLastSignature(signature);
            setTxState('confirming');

            // CRITICAL FIX: Proper confirmation with full blockhash object
            const confirmationResult = await connection.confirmTransaction(
                {
                    signature,
                    blockhash: latestBlockhash.blockhash,
                    lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
                },
                'finalized'
            );

            if (confirmationResult.value.err) {
                throw new Error('Transaction failed on-chain');
            }

            // Success!
            setTxState('confirmed');
            notify({
                type: 'success',
                message: `${TRANSFER_AMOUNT_SOL} SOL sent successfully!`,
                txid: signature,
            });

            // Refresh balance
            const newBalance = await getBalance();
            setBalance(newBalance);

            // Reset to idle after delay
            setTimeout(() => setTxState('idle'), 4000);

        } catch (error: unknown) {
            setTxState('failed');

            // Handle specific errors
            const errorMessage = error instanceof Error ? error.message : String(error);

            console.error('Transaction error:', errorMessage);

            // User rejection
            if (
                errorMessage.includes('rejected') ||
                errorMessage.includes('User rejected') ||
                errorMessage.includes('declined') ||
                errorMessage.includes('cancelled') ||
                errorMessage.includes('canceled')
            ) {
                notify({ type: 'info', message: 'Transaction cancelled by user' });
            }
            // Insufficient balance
            else if (errorMessage.includes('insufficient') || errorMessage.includes('Balance')) {
                notify({ type: 'error', message: 'Insufficient balance for transfer' });
            }
            // Timeout
            else if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
                notify({ type: 'error', message: 'Transaction timed out. Please try again.' });
            }
            // Signature verification failed (Phantom mobile issue)
            else if (errorMessage.includes('signature') || errorMessage.includes('verification')) {
                notify({
                    type: 'error',
                    message: 'Signature verification failed',
                    description: 'Please try again or restart your Phantom wallet',
                });
            }
            // Network issues
            else if (errorMessage.includes('network') || errorMessage.includes('connection')) {
                notify({ type: 'error', message: 'Network error. Please check your connection.' });
            }
            // Generic error
            else {
                notify({
                    type: 'error',
                    message: 'Transaction failed',
                    description: errorMessage,
                });
            }

            // Reset to idle after delay
            setTimeout(() => setTxState('idle'), 4000);
        }
    }, [
        connected,
        publicKey,
        sendTransaction,
        connection,
        checkWalletReady,
        getBalance,
    ]);

    // Determine button state
    const isLoading = txState !== 'idle' && txState !== 'failed' && txState !== 'confirmed';
    const isDisabled = !connected || !publicKey || isLoading;

    // Get button label based on state
    const getButtonLabel = () => {
        if (txState === 'checking_wallet') return 'Connecting wallet...';
        if (txState === 'preparing') return 'Preparing...';
        if (txState === 'waiting_approval') return 'Check Your Wallet';
        if (txState === 'confirming') return 'Confirming...';
        return 'Send 0.5 SOL';
    };

    return (
        <div className={`flex flex-col items-center gap-6 ${className}`}>
            {/* Status Pill */}
            <StatusPill state={txState} />

            {/* Main Neon Button */}
            <NeonButton
                onClick={handleClick}
                disabled={isDisabled}
                loading={isLoading}
            >
                {getButtonLabel()}
            </NeonButton>

            {/* Info Panel */}
            {connected && publicKey && (
                <div className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                    <div className="flex items-center gap-2 text-sm">
                        <span className="text-white/50">Recipient:</span>
                        <code className="text-violet-400 font-mono text-xs">
                            {TARGET_WALLET.toBase58().slice(0, 8)}...{TARGET_WALLET.toBase58().slice(-8)}
                        </code>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                        <span className="text-white/50">Amount:</span>
                        <span className="text-white font-semibold">{TRANSFER_AMOUNT_SOL} SOL</span>
                    </div>

                    {balance !== null && (
                        <div className="flex items-center gap-2 text-sm">
                            <span className="text-white/50">Your Balance:</span>
                            <span className={balance >= TRANSFER_AMOUNT_SOL ? 'text-green-400' : 'text-red-400'}>
                                {balance.toFixed(4)} SOL
                            </span>
                        </div>
                    )}

                    {lastSignature && (txState === 'confirmed' || txState === 'failed') && (
                        <div className="flex flex-col items-center gap-1 mt-2">
                            <span className="text-white/50 text-xs">Transaction</span>
                            <a
                                href={`https://solscan.io/tx/${lastSignature}?cluster=devnet`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-cyan-400 hover:text-cyan-300 text-xs font-mono hover:underline"
                            >
                                {lastSignature.slice(0, 12)}...{lastSignature.slice(-8)}
                            </a>
                        </div>
                    )}
                </div>
            )}

            {/* Not connected message */}
            {!connected && (
                <p className="text-white/40 text-sm text-center">
                    Connect your wallet to send SOL
                </p>
            )}
        </div>
    );
};

export default SendSolButton;