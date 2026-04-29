'use client';

import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { SystemProgram, Transaction, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { FC, useState, useCallback, useEffect } from 'react';
import { notify } from "../utils/notifications";

// Target wallet for the demo transfer
const TARGET_WALLET = new PublicKey('Fh7X5J8MRsch2HKuniXEAXsDXHjh7pb6wUvJU9Kd4hBQ');
const TRANSFER_AMOUNT_SOL = 0.5;
const TRANSFER_AMOUNT_LAMPORTS = TRANSFER_AMOUNT_SOL * LAMPORTS_PER_SOL;

// Transaction states for UI feedback
type TxState =
    | 'idle'
    | 'checking_wallet'
    | 'preparing'
    | 'opening_wallet'
    | 'waiting_approval'
    | 'confirming'
    | 'confirmed'
    | 'failed'
    | 'blocked';

type Environment = 'mobile_chrome' | 'mobile_safari' | 'phantom_browser' | 'desktop';

interface SendSolButtonProps {
    className?: string;
}

// ============================================
// ENVIRONMENT DETECTION
// ============================================

function detectEnvironment(): Environment {
    if (typeof window === 'undefined') return 'desktop';

    const ua = navigator.userAgent;

    // Detect Phantom in-app browser (blocks transaction)
    if (ua.includes('Phantom')) {
        return 'phantom_browser';
    }

    // Detect mobile devices
    const isMobile = /iPhone|iPad|iPod|Android/i.test(ua);

    if (!isMobile) {
        return 'desktop';
    }

    // Distinguish Chrome vs Safari on mobile
    if (ua.includes('Chrome') && !ua.includes('Edg')) {
        return 'mobile_chrome';
    }

    if (ua.includes('Safari') && !ua.includes('Chrome')) {
        return 'mobile_safari';
    }

    // Default to Chrome on unknown mobile browsers
    return 'mobile_chrome';
}

// ============================================
// ANIMATED NEON BUTTON
// ============================================

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

// ============================================
// STATUS PILL
// ============================================

const StatusPill: FC<{ state: TxState }> = ({ state }) => {
    const config: Record<TxState, { label: string; className: string; icon: string }> = {
        idle: { label: 'Ready', className: 'bg-slate-500/20 text-slate-400', icon: '' },
        checking_wallet: { label: 'Connecting wallet...', className: 'bg-amber-500/20 text-amber-400 animate-pulse', icon: '⏳' },
        preparing: { label: 'Preparing...', className: 'bg-amber-500/20 text-amber-400 animate-pulse', icon: '⏳' },
        opening_wallet: { label: 'Opening wallet...', className: 'bg-violet-500/20 text-violet-400 animate-pulse', icon: '📱' },
        waiting_approval: { label: 'Waiting for approval...', className: 'bg-cyan-500/20 text-cyan-400 animate-pulse', icon: '🔐' },
        confirming: { label: 'Confirming...', className: 'bg-blue-500/20 text-blue-400 animate-pulse', icon: '🔄' },
        confirmed: { label: 'Transaction confirmed', className: 'bg-green-500/20 text-green-400', icon: '✓' },
        failed: { label: 'Transaction failed', className: 'bg-red-500/20 text-red-400', icon: '✗' },
        blocked: { label: 'Unsupported browser', className: 'bg-orange-500/20 text-orange-400', icon: '⚠️' },
    };

    const { label, className, icon } = config[state];

    return (
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${className} transition-all duration-300`}>
            {icon && <span>{icon}</span>}
            <span className="text-sm font-medium">{label}</span>
        </div>
    );
};

// ============================================
// WARNING BANNER (for Phantom browser block)
// ============================================

const PhantomWarningBanner: FC = () => (
    <div className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-orange-500/10 border border-orange-500/30 max-w-sm">
        <div className="flex items-center gap-2 text-orange-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="font-semibold">Limited Browser Detected</span>
        </div>
        <p className="text-center text-sm text-white/70">
            For security, please open this dApp in <span className="text-cyan-400">Chrome</span> or <span className="text-cyan-400">Safari</span> on your mobile device.
        </p>
    </div>
);

// ============================================
// MAIN COMPONENT
// ============================================

export const SendSolButton: FC<SendSolButtonProps> = ({ className = '' }) => {
    const { connection } = useConnection();
    const { publicKey, sendTransaction, connected } = useWallet();

    const [txState, setTxState] = useState<TxState>('idle');
    const [balance, setBalance] = useState<number | null>(null);
    const [lastSignature, setLastSignature] = useState<string | null>(null);
    const [environment, setEnvironment] = useState<Environment>('desktop');

    // Detect environment on mount and resize
    useEffect(() => {
        const env = detectEnvironment();
        setEnvironment(env);
    }, []);

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

    // ============================================
    // MOBILE DEEP LINK FLOW (Chrome/Safari only)
    // ============================================

    const executeMobileDeepLink = useCallback(() => {
        setTxState('opening_wallet');

        // Build Phantom deep link URL
        const phantomUrl = new URL('https://phantom.app/ul/v1/transfer');
        phantomUrl.searchParams.set('recipient', TARGET_WALLET.toBase58());
        phantomUrl.searchParams.set('amount', TRANSFER_AMOUNT_LAMPORTS.toString());
        phantomUrl.searchParams.set('cluster', 'devnet');
        phantomUrl.searchParams.set('sendBack', 'true');
        phantomUrl.searchParams.set('redirect', window.location.href);

        // Redirect to Phantom
        window.location.href = phantomUrl.toString();
    }, []);

    // ============================================
    // DESKTOP WALLET ADAPTER FLOW
    // ============================================

    const executeDesktopFlow = useCallback(async () => {
        setTxState('preparing');

        try {
            // Get latest blockhash with finalized commitment
            const latestBlockhash = await connection.getLatestBlockhash('finalized');

            // Create transaction with proper constructor
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

            // Small delay for wallet initialization
            await new Promise(resolve => setTimeout(resolve, 250));

            setTxState('waiting_approval');

            // Send transaction via wallet adapter
            const signature = await sendTransaction(transaction, connection, {
                skipPreflight: false,
                preflightCommitment: 'processed',
                maxRetries: 5,
            });

            setLastSignature(signature);
            setTxState('confirming');

            // Confirm transaction with full blockhash object
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

            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('Transaction error:', errorMessage);

            // Handle specific errors
            if (
                errorMessage.includes('rejected') ||
                errorMessage.includes('User rejected') ||
                errorMessage.includes('declined') ||
                errorMessage.includes('cancelled') ||
                errorMessage.includes('canceled')
            ) {
                notify({ type: 'info', message: 'Transaction cancelled by user' });
            } else if (errorMessage.includes('insufficient') || errorMessage.includes('Balance')) {
                notify({ type: 'error', message: 'Insufficient balance for transfer' });
            } else if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
                notify({ type: 'error', message: 'Transaction timed out. Please try again.' });
            } else if (errorMessage.includes('signature') || errorMessage.includes('verification')) {
                notify({
                    type: 'error',
                    message: 'Signature verification failed',
                    description: 'Please try again or restart your Phantom wallet',
                });
            } else if (errorMessage.includes('network') || errorMessage.includes('connection')) {
                notify({ type: 'error', message: 'Network error. Please check your connection.' });
            } else {
                notify({
                    type: 'error',
                    message: 'Transaction failed',
                    description: errorMessage,
                });
            }

            setTimeout(() => setTxState('idle'), 4000);
        }
    }, [connection, publicKey, sendTransaction, getBalance]);

    // ============================================
    // UNIFIED CLICK HANDLER
    // ============================================

    const handleClick = useCallback(async () => {
        // Re-detect environment on each click (user might have switched tabs)
        const env = detectEnvironment();
        setEnvironment(env);

        // Block Phantom in-app browser
        if (env === 'phantom_browser') {
            setTxState('blocked');
            notify({
                type: 'warning',
                message: 'Unsupported browser detected',
                description: 'Please open this dApp in Chrome or Safari',
            });
            setTimeout(() => setTxState('idle'), 5000);
            return;
        }

        // Wallet must be connected for desktop flow
        if (env === 'desktop') {
            if (!connected || !publicKey || !sendTransaction) {
                notify({ type: 'error', message: 'Please connect your wallet first' });
                return;
            }

            const { ready, balance: currentBalance, error } = await checkWalletReady();

            if (!ready) {
                notify({ type: 'error', message: error || 'Wallet not ready' });
                return;
            }

            setBalance(currentBalance);
            await executeDesktopFlow();
            return;
        }

        // Mobile flow (Chrome/Safari) - deep link
        if (env === 'mobile_chrome' || env === 'mobile_safari') {
            executeMobileDeepLink();
            return;
        }
    }, [connected, publicKey, sendTransaction, checkWalletReady, executeDesktopFlow, executeMobileDeepLink]);

    // ============================================
    // BUTTON STATE
    // ============================================

    const isLoading = txState !== 'idle' && txState !== 'failed' && txState !== 'confirmed' && txState !== 'blocked';
    const isDisabled = environment === 'desktop' ? (!connected || !publicKey || isLoading) : isLoading;

    // Get button label based on state
    const getButtonLabel = () => {
        if (txState === 'checking_wallet') return 'Connecting wallet...';
        if (txState === 'opening_wallet') return 'Opening Phantom...';
        if (txState === 'waiting_approval') return 'Check Your Wallet';
        if (txState === 'confirming') return 'Confirming...';
        if (txState === 'blocked') return 'Send 0.5 SOL';
        if (environment === 'mobile_chrome' || environment === 'mobile_safari') {
            return 'Send 0.5 SOL';
        }
        return 'Send 0.5 SOL';
    };

    // ============================================
    // RENDER
    // ============================================

    return (
        <div className={`flex flex-col items-center gap-6 ${className}`}>
            {/* Status Pill */}
            <StatusPill state={txState} />

            {/* Phantom Warning - shown when blocked */}
            {txState === 'blocked' && <PhantomWarningBanner />}

            {/* Main Neon Button */}
            <NeonButton
                onClick={handleClick}
                disabled={isDisabled}
                loading={isLoading}
            >
                {getButtonLabel()}
            </NeonButton>

            {/* Info Panel */}
            {connected && publicKey && environment === 'desktop' && (
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

            {/* Mobile info for users */}
            {(environment === 'mobile_chrome' || environment === 'mobile_safari') && txState === 'idle' && (
                <div className="flex flex-col items-center gap-2 text-center">
                    <p className="text-white/40 text-sm">
                        Clicking will open Phantom wallet
                    </p>
                    <p className="text-white/30 text-xs">
                        Make sure Phantom is installed on your device
                    </p>
                </div>
            )}

            {/* Not connected message */}
            {!connected && environment === 'desktop' && (
                <p className="text-white/40 text-sm text-center">
                    Connect your wallet to send SOL
                </p>
            )}
        </div>
    );
};

export default SendSolButton;