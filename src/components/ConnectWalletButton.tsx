'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useCallback, useEffect, useRef, useState, FC, MouseEvent, ReactNode } from 'react';
import { useWalletStatus } from '../hooks/useWalletStatus';

// ============================================
// TYPES
// ============================================

export type WalletStatusType = 'disconnected' | 'connecting' | 'connected';

interface ConnectWalletButtonProps {
  className?: string;
  size?: number;
  showAddress?: boolean;
  onDisconnect?: () => void;
}

// ============================================
// WALLET ICONS — SVG Components (2026 style)
// ============================================

const WalletIcon: FC<{ size: number; color?: string }> = ({
  size,
  color = 'currentColor',
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h13a1 1 0 0 1 1 1v4h-1" />
    <rect x="1" y="11" width="22" height="11" rx="2" ry="2" />
    <circle cx="18" cy="16" r="1" />
  </svg>
);

const SpinnerIcon: FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="animate-spin">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeOpacity="0.2" />
    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const CheckIcon: FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const ChevronDownIcon: FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const DisconnectIcon: FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
    <line x1="2" y1="2" x2="22" y2="22" />
  </svg>
);

// ============================================
// WALLET BRAND ICONS
// ============================================

const PhantomIcon: FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 128 128" fill="none">
    <rect width="128" height="128" rx="32" fill="url(#pg)" />
    <path d="M103.35 72.19a61.45 61.45 0 0 0-9.38-10.08c8.3-7.94 13.28-19.5 11.51-31.6-3.4-23.23-32.07-33.64-53.32-17.44a35.27 35.27 0 0 0-6.72 5.79c-1.8 1.98-3.44 4.09-4.88 6.33-5.34-2.2-11.25-2.55-16.87-.88-11.62 3.46-18.43 15.44-15.62 27.14 2.37 9.87 10.4 17.12 20.1 18.72a27.37 27.37 0 0 0 9.58-.16c-5.16 5.08-8.27 12.12-8.39 19.78-.11 7.2 2.66 14.01 7.57 19.03 6.9 7.06 17.67 8.82 26.33 4.3a30.4 30.4 0 0 0 6.96-4.85c.54.28 1.1.54 1.68.78 11.61 4.83 24.98.8 32.45-9.84 8.01-11.43 5.75-27.48-4.9-35.02z" fill="white" />
    <defs><linearGradient id="pg" x1="0" y1="0" x2="128" y2="128" gradientUnits="userSpaceOnUse"><stop stopColor="#534BB1" /><stop offset="1" stopColor="#551BF9" /></linearGradient></defs>
  </svg>
);

const SolflareIcon: FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 128 128" fill="none">
    <rect width="128" height="128" rx="32" fill="#1E1E24" />
    <path d="M72.5 35h-12l-14.5 29h12l-6 12h12l18-36h-12l6-12h-12l14.5 29h12l-6-12h12l18-36h-12l6-12h-12l14.5 29z" fill="url(#sg)" />
    <defs><linearGradient id="sg" x1="32" y1="35" x2="96" y2="93" gradientUnits="userSpaceOnUse"><stop stopColor="#FF6C2F" /><stop offset="1" stopColor="#FFB347" /></linearGradient></defs>
  </svg>
);

const BackpackIcon: FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 128 128" fill="none">
    <rect width="128" height="128" rx="32" fill="#5719C0" />
    <path d="M96 32H32a8 8 0 0 0-8 8v48a8 8 0 0 0 8 8h12v16a8 8 0 0 0 8 8h32a8 8 0 0 0 8-8v-16h12a8 8 0 0 0 8-8V40a8 8 0 0 0-8-8zm-36 68a12 12 0 1 1 12-12 12 12 0 0 1-12 12z" fill="white" />
  </svg>
);

// Extensible wallet registry (adapter pattern)
const WALLET_REGISTRY: Record<string, {
  name: string;
  icon: ReactNode;
  iconName: string;
  detect: () => boolean;
}> = {
  phantom: {
    name: 'Phantom',
    iconName: 'phantom',
    icon: <PhantomIcon size={36} />,
    detect: () => !!(window as typeof window & { phantom?: { solana?: { isPhantom?: boolean } } }).phantom?.solana?.isPhantom,
  },
  solflare: {
    name: 'Solflare',
    iconName: 'solflare',
    icon: <SolflareIcon size={36} />,
    detect: () => !!(window as typeof window & { solflare?: { isSolflare?: boolean } }).solflare?.isSolflare,
  },
  backpack: {
    name: 'Backpack',
    iconName: 'backpack',
    icon: <BackpackIcon size={36} />,
    detect: () => !!(window as typeof window & { backpack?: { isBackpack?: boolean } }).backpack?.isBackpack,
  },
};

// ============================================
// WALLET SELECTION MODAL
// ============================================

interface WalletModalProps {
  onClose: () => void;
  onWalletSelect: (walletKey: string) => void;
}

const WalletModal: FC<WalletModalProps> = ({ onClose, onWalletSelect }) => {
  const [detectedWallets, setDetectedWallets] = useState<Set<string>>(new Set());
  const [hoveredWallet, setHoveredWallet] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const detected = new Set<string>();
    Object.entries(WALLET_REGISTRY).forEach(([key, config]) => {
      if (config.detect()) detected.add(key);
    });
    setDetectedWallets(detected);
  }, []);

  // Close on backdrop click
  const handleBackdropClick = useCallback((e: MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-overlay animate-fade-in"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className="wallet-modal-content w-full max-w-[380px]"
        role="dialog"
        aria-modal="true"
        aria-label="Select wallet"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-white">Connect Wallet</h2>
            <p className="text-xs text-white/40 mt-0.5">Choose your preferred wallet</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-200"
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Wallet List */}
        <div className="space-y-2.5">
          {Object.entries(WALLET_REGISTRY).map(([key, wallet]) => {
            const isInstalled = detectedWallets.has(key);
            const isHovered = hoveredWallet === key;

            return (
              <button
                key={key}
                onClick={() => { onWalletSelect(key); onClose(); }}
                onMouseEnter={() => setHoveredWallet(key)}
                onMouseLeave={() => setHoveredWallet(null)}
                className={`
                  w-full flex items-center gap-4 p-4 rounded-2xl
                  glass-modal-item cursor-pointer
                  transition-all duration-200 ease-out
                  ${isHovered ? 'bg-white/[0.06] border-white/12 translate-x-1' : ''}
                `}
              >
                <div className="w-11 h-11 rounded-xl bg-white/[0.05] flex items-center justify-center flex-shrink-0">
                  {wallet.icon}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="text-white font-medium text-sm">{wallet.name}</div>
                  <div className="text-white/30 text-xs mt-0.5">
                    {isInstalled ? 'Detected' : 'Click to connect'}
                  </div>
                </div>
                <div className={`
                  w-6 h-6 rounded-full border flex items-center justify-center
                  transition-all duration-200
                  ${isHovered ? 'border-white/40 bg-white/5' : 'border-white/10'}
                `}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/30">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-white/25 text-xs">
          New to Solana?{' '}
          <a href="https://solana.com/wallets" target="_blank" rel="noopener noreferrer" className="text-purple-400/50 hover:text-purple-400 transition-colors">
            Learn more
          </a>
        </p>
      </div>
    </div>
  );
};

// ============================================
// CONNECTED WALLET DROPDOWN
// ============================================

interface WalletDropdownProps {
  onDisconnect: () => void;
  onClose: () => void;
}

const WalletDropdown: FC<WalletDropdownProps> = ({ onDisconnect, onClose }) => {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { wallet } = useWallet();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Close on backdrop click
  const handleBackdropClick = useCallback((e: MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  // Get wallet icon
  const getWalletIcon = () => {
    const name = wallet?.adapter?.name?.toLowerCase() || '';
    if (name.includes('phantom')) return <PhantomIcon size={20} />;
    if (name.includes('solflare')) return <SolflareIcon size={20} />;
    if (name.includes('backpack')) return <BackpackIcon size={20} />;
    return null;
  };

  return (
    <div
      className="fixed inset-0 z-[100] backdrop-overlay"
      onClick={handleBackdropClick}
    >
      <div
        ref={dropdownRef}
        className="absolute top-full right-0 mt-2 w-56 rounded-2xl p-2 wallet-modal-content"
      >
        {/* Connected wallet info */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] mb-2">
          <div className="w-10 h-10 rounded-xl bg-white/[0.05] flex items-center justify-center">
            {getWalletIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-sm font-medium truncate">
              {wallet?.adapter?.name || 'Wallet'}
            </div>
            <div className="text-white/40 text-xs">Connected</div>
          </div>
          <div className="w-2 h-2 rounded-full bg-green-400" />
        </div>

        {/* Disconnect button */}
        <button
          onClick={() => { onDisconnect(); onClose(); }}
          className="w-full flex items-center gap-3 p-3 rounded-xl text-red-400/80 hover:text-red-400 hover:bg-red-400/10 transition-all duration-200 cursor-pointer"
        >
          <DisconnectIcon size={18} />
          <span className="text-sm font-medium">Disconnect</span>
        </button>
      </div>
    </div>
  );
};

// ============================================
// CIRCULAR CONNECT WALLET BUTTON
// ============================================

export const ConnectWalletButton: FC<ConnectWalletButtonProps> = ({
  className = '',
  size = 64,
  showAddress = false,
  onDisconnect,
}) => {
  const { status, connecting, connected, truncatedAddress } = useWalletStatus();
  const { connect, disconnect } = useWallet();
  const { setVisible } = useWalletModal();
  const { wallet } = useWallet();

  const [showModal, setShowModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [ripple, setRipple] = useState<{ x: number; y: number } | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Handle wallet selection from modal
  // Delegates to the standard wallet modal (setVisible) for proper adapter handling
  const handleWalletSelect = useCallback(async (walletKey: string) => {
    // The standard wallet modal handles the connection flow
    // This callback can be used for analytics or custom behavior
    console.log('Wallet selected:', walletKey);
  }, []);

  // Open modal/dropdown on click
  const handleClick = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      // Ripple effect
      const rect = buttonRef.current?.getBoundingClientRect();
      if (rect) {
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setRipple({ x, y });
        setTimeout(() => setRipple(null), 600);
      }

      if (connected) {
        setShowDropdown((prev) => !prev);
      } else if (!connecting) {
        setVisible(true);
      }
    },
    [connected, connecting, setVisible]
  );

  // Handle disconnect
  const handleDisconnect = useCallback(async () => {
    try {
      await disconnect();
      onDisconnect?.();
      setShowDropdown(false);
    } catch (err) {
      console.error('Disconnect failed:', err);
    }
  }, [disconnect, onDisconnect]);

  // Derive label
  const getLabel = () => {
    if (connected) {
      return showAddress && truncatedAddress ? truncatedAddress : 'Connected';
    }
    if (connecting) return 'Connecting';
    return 'Connect';
  };

  // Derive icon
  const renderIcon = () => {
    const iconSize = Math.round(size * 0.35);

    if (connecting) return <SpinnerIcon size={iconSize} />;
    if (connected) return <CheckIcon size={iconSize} />;
    return <WalletIcon size={iconSize} color="rgba(255,255,255,0.9)" />;
  };

  // Get glow color based on status
  const getGlowColor = () => {
    if (connected) return 'rgba(153, 69, 255, 0.35)';
    if (connecting) return 'rgba(255, 180, 50, 0.4)';
    return 'rgba(255, 255, 255, 0.05)';
  };

  return (
    <>
      <div className="flex flex-col items-center">
        <button
          ref={buttonRef}
          onClick={handleClick}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onMouseDown={() => setIsPressed(true)}
          onMouseUp={() => setIsPressed(false)}
          className={`
            relative flex items-center justify-center rounded-full
            transition-all duration-300 ease-out
            glass-button cursor-pointer
            ${isHovered && !connected ? 'scale-110' : ''}
            ${isPressed ? 'scale-95' : ''}
            ${connecting ? 'animate-pulse-glow' : ''}
            ${connected ? 'connected-wallet' : ''}
          `}
          style={{
            width: size,
            height: size,
            borderColor: getGlowColor(),
          }}
          aria-label={
            connected ? `Wallet connected: ${truncatedAddress}` :
            connecting ? 'Connecting wallet...' : 'Connect wallet'
          }
        >
          {/* Pulse ring when connected */}
          {connected && !isHovered && !isPressed && (
            <div className="animate-pulse-ring" />
          )}

          {/* Ripple */}
          {ripple && (
            <span
              className="ripple"
              style={{
                left: ripple.x,
                top: ripple.y,
              }}
            />
          )}

          {/* Icon */}
          <div className={`
            flex items-center justify-center z-10
            transition-colors duration-300
            ${connected ? 'text-purple-400' : connecting ? 'text-amber-400' : 'text-white/90'}
          `}>
            {renderIcon()}
          </div>

          {/* Status dot */}
          <div className={`
            absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full border-2 border-black/50
            transition-colors duration-300
            ${connected ? 'bg-green-400' : connecting ? 'bg-amber-400' : 'bg-white/30'}
          `} />

          {/* Hover glow */}
          {isHovered && (
            <div
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{
                boxShadow: `0 0 ${size * 0.5}px ${connected ? 'rgba(153, 69, 255, 0.4)' : 'rgba(255, 255, 255, 0.2)'}`,
              }}
            />
          )}
        </button>

        {/* Label */}
        <span className={`
          mt-2 text-[11px] font-medium tracking-wide
          transition-colors duration-300
          ${connected ? 'text-white/60' : 'text-white/40'}
        `}>
          {getLabel()}
        </span>
      </div>

      {/* Wallet Selection Modal */}
      {showModal && (
        <WalletModal
          onClose={() => setShowModal(false)}
          onWalletSelect={handleWalletSelect}
        />
      )}

      {/* Connected Wallet Dropdown */}
      {showDropdown && (
        <WalletDropdown
          onDisconnect={handleDisconnect}
          onClose={() => setShowDropdown(false)}
        />
      )}
    </>
  );
};

export default ConnectWalletButton;