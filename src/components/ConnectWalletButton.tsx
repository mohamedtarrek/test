import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Wallet } from '@solana/wallet-adapter-react';

const WALLET_ICONS: Record<string, string> = {
    phantom: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSIjQUI5RkYyIiBkPSJNMTIgMGMyLjY2NyAwIDEyIDUuMzMzIDEyIDEycy01LjMzMyAxMi0xMiAxMi0xMi01LjMzMy0xMi0xMnM1LjMzMy0xMiAxMi0xMnptMCAxOGMuNS41NSAxLjI1MSAxLjAwNCAyLjUgMS4wMDRzMS45NzMtLjQ0OSAyLjUtMS4wMDRWM2EuMjY5LS4yNjktLjctLjUtMS4wMDhoLTJ2My41Yy0uMjY5LjI2OS0uNSAuNy0xLjAwOCAxLjAwOC4yNjkuMjY5LjUgLjc1IDEuMDA4IDEuMDA0eiIvPjxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxwYXRoIGQ9Ik0xMiA1LjM3NWMtMy42NTUgMC02LjYyNSAyLjk3LTYuNjI1IDYuNjI1IDAgMy42NTUgMi45NyA2LjYyNSA2LjYyNSA2LjYyNSAzLjY1NSAwIDYuNjI1LTIuOTcgNi42MjUtNi42MjUgMC0zLjY1NS0yLjk3LTYuNjI1LTYuNjI1LTYuNjI1em0wIDkuMjV2My41Yy0uMjY5LjI2OS0uNSAuNy0xLjAwOCAxLjAwOC4yNjkuMjY5LjUgLjc1IDEuMDA4IDEuMDA0czEuOTczLS40NDkgMi41LTEuMDA0czEuOTczLjQ0OSAyLjUgMS4wMDR2LTMuNWMtLjI2OS0uMjY5LS41LS43LTEuMDA4LTEuMDA0cy0uNS0uNzUtMS4wMDgtMS4wMDR6Ii8+PC9zdmc+PC9zdmc+',
    solflare: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSIjMjhBMEY1Ij48cmVjdCB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHJ4PSIyIiBmaWxsPSIjMjhBMEY1Ii8+PHBhdGggZD0iTTE3IDguNXY1SDd2LTVoNC41YzEuNjY3IDAgMi41IDEuODMzIDIuNSA0IDIuNSAxLjE2Ny0xLjEzMyAyLTEuNSAyMGgxLjVWMTVIMTd2LTEuNWMtLjMzMyAxLTEuNSAxLjUtMS41IDVWMTMuNSIvPjwvc3ZnPg==',
    backpack: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSIjMzMzIiBzdHJrYW9wYWNpdHk9IjAuNiI+PHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiByeD0iNSIgZmlsbD0iIzAwMERGIi8+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iNSIgZmlsbD0iIzAwMEREIi8+PC9zdmc+',
    glow: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJ5ZWxsb3ciPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjEwIiBmaWxsPSIjZmY5OTk5Ii8+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iNSIgZmlsbD0iIzAwMCIvPjwvc3ZnPg==',
};

const DISCONNECT_ICON = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxwYXRoIGQ9Ik0xNiA4TDEzIDVWNkg3djJINXYzdjhoMXYtM2gtMlY1bDMtM0g1djEzaDh2LTRoLTJ2LTRoMnYtMWg0djFoMy41bDMgMy41TDE2IDh6Ii8+PC9zdmc+';

type WalletStatus = 'disconnected' | 'connecting' | 'connected';

interface ConnectWalletButtonProps {
    className?: string;
}

export function ConnectWalletButton({ className = '' }: ConnectWalletButtonProps) {
    const { connected, connecting, wallet, connect, disconnect } = useWallet();
    const [status, setStatus] = useState<WalletStatus>('disconnected');
    const [showModal, setShowModal] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [isPressed, setIsPressed] = useState(false);
    const [ripple, setRipple] = useState(false);

    // Sync with wallet adapter state
    useEffect(() => {
        if (connecting) {
            setStatus('connecting');
        } else if (connected) {
            setStatus('connected');
            setShowModal(false);
        } else {
            setStatus('disconnected');
        }
    }, [connecting, connected]);

    const handleClick = useCallback(() => {
        if (status === 'connected') {
            setShowModal((prev) => !prev);
        } else if (status === 'disconnected') {
            setShowModal(true);
        }
    }, [status]);

    const handleDisconnect = useCallback(async () => {
        try {
            await disconnect();
            setShowModal(false);
        } catch (err) {
            console.error('Disconnect failed:', err);
        }
    }, [disconnect]);

    const handleModalClose = useCallback(() => {
        setShowModal(false);
    }, []);

    const triggerRipple = useCallback(() => {
        setRipple(true);
        setTimeout(() => setRipple(false), 600);
    }, []);

    const getWalletIcon = () => {
        if (!wallet?.adapter?.name) return null;
        const name = wallet.adapter.name.toLowerCase();
        return WALLET_ICONS[name] || null;
    };

    const walletIcon = getWalletIcon();
    const truncatedAddress = wallet?.adapter?.publicKey
        ? `${wallet.adapter.publicKey.toBase58().slice(0, 4)}...${wallet.adapter.publicKey.toBase58().slice(-4)}`
        : '';

    return (
        <div className={`relative ${className}`}>
            {/* Circular Connect Button */}
            <button
                onClick={handleClick}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onMouseDown={() => setIsPressed(true)}
                onMouseUp={() => setIsPressed(false)}
                onTouchStart={() => setIsPressed(true)}
                onTouchEnd={() => setIsPressed(false)}
                className={`
                    relative w-14 h-14 rounded-full
                    flex items-center justify-center
                    transition-all duration-300 ease-out
                    glass-button
                    ${isHovered && !connected ? 'scale-110' : ''}
                    ${isPressed ? 'scale-95' : ''}
                    ${status === 'connecting' ? 'animate-pulse-glow' : ''}
                    ${status === 'connected' && walletIcon ? 'connected-wallet' : ''}
                `}
                aria-label={status === 'connected' ? 'Wallet connected' : 'Connect wallet'}
            >
                {/* Ripple effect */}
                {ripple && <span className="ripple" />}

                {/* Status content */}
                <div className="relative z-10 flex items-center justify-center">
                    {status === 'disconnected' && (
                        <svg className="w-6 h-6 text-white/90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                    )}

                    {status === 'connecting' && (
                        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    )}

                    {status === 'connected' && walletIcon && (
                        <img src={walletIcon} alt={wallet?.adapter?.name || 'Wallet'} className="w-7 h-7 rounded-full" />
                    )}
                </div>

                {/* Outer glow ring when connected */}
                {status === 'connected' && (
                    <span className="absolute inset-0 rounded-full animate-pulse-ring" />
                )}
            </button>

            {/* Connected address label */}
            {status === 'connected' && (
                <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap">
                    <span className="text-[10px] font-mono text-white/60">{truncatedAddress}</span>
                </div>
            )}

            {/* Wallet Selection Modal */}
            {showModal && (
                <WalletModal
                    onClose={handleModalClose}
                    onDisconnect={handleDisconnect}
                    isConnected={status === 'connected'}
                    walletName={wallet?.adapter?.name || ''}
                />
            )}
        </div>
    );
}

// Wallet Selection Modal Component
interface WalletModalProps {
    onClose: () => void;
    onDisconnect: () => void;
    isConnected: boolean;
    walletName: string;
}

function WalletModal({ onClose, onDisconnect, isConnected, walletName }: WalletModalProps) {
    const { wallets, select, connecting } = useWallet();
    const [selectedWallet, setSelectedWallet] = useState<string | null>(null);

    // Detect mobile wallet browser
    const isMobileWalletBrowser = useCallback(() => {
        if (typeof window === 'undefined') return false;
        const win = window as any;
        return !!(win.phantom?.solana?.isPhantom || win.solana?.isPhantom || win.solflare?.isSolflare);
    }, []);

    const handleWalletSelect = useCallback(async (wallet: Wallet) => {
        setSelectedWallet(wallet.adapter.name);
        try {
            select(wallet.adapter.name);
            // Modal closes automatically on successful connection via useEffect
        } catch (err) {
            console.error('Wallet connection error:', err);
            setSelectedWallet(null);
        }
    }, [select]);

    // Close on backdrop click
    const handleBackdropClick = useCallback((e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    }, [onClose]);

    // Close on escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    const getWalletIcon = (wallet: Wallet) => {
        const name = wallet.adapter.name.toLowerCase();
        return WALLET_ICONS[name] || null;
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-overlay"
            onClick={handleBackdropClick}
        >
            <div className="wallet-modal-content">
                {/* Modal header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-lg font-semibold text-white">Connect Wallet</h3>
                        <p className="text-xs text-white/50 mt-1">Select your preferred wallet</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
                    >
                        <svg className="w-5 h-5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Wallet list */}
                <div className="space-y-2">
                    {wallets.map((wallet) => {
                        const icon = getWalletIcon(wallet);
                        const isSelected = selectedWallet === wallet.adapter.name && connecting;
                        const isThisWallet = wallet.adapter.name === walletName && isConnected;

                        return (
                            <button
                                key={wallet.adapter.name}
                                onClick={() => handleWalletSelect(wallet)}
                                disabled={connecting}
                                className={`
                                    w-full flex items-center gap-3 px-4 py-3
                                    glass-modal-item
                                    ${isThisWallet ? 'wallet-connected-item' : ''}
                                    ${isSelected ? 'opacity-75' : ''}
                                `}
                            >
                                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center overflow-hidden">
                                    {icon ? (
                                        <img src={icon} alt={wallet.adapter.name} className="w-6 h-6" />
                                    ) : (
                                        <span className="text-sm font-medium">{wallet.adapter.name[0]}</span>
                                    )}
                                </div>
                                <div className="flex-1 text-left">
                                    <span className="text-white font-medium">{wallet.adapter.name}</span>
                                    {isThisWallet && (
                                        <span className="ml-2 text-[10px] text-green-400 bg-green-400/20 px-2 py-0.5 rounded-full">Connected</span>
                                    )}
                                </div>
                                {isSelected ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <svg className="w-5 h-5 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Disconnect option when connected */}
                {isConnected && (
                    <div className="mt-6 pt-4 border-t border-white/10">
                        <button
                            onClick={onDisconnect}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-colors"
                        >
                            <img src={DISCONNECT_ICON} alt="Disconnect" className="w-5 h-5" />
                            <span>Disconnect {walletName}</span>
                        </button>
                    </div>
                )}

                {/* Mobile notice */}
                {isMobileWalletBrowser() && (
                    <p className="mt-4 text-xs text-center text-white/40">
                        In-app browser detected. Connection will open in your wallet app.
                    </p>
                )}
            </div>
        </div>
    );
}
