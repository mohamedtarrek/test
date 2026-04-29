import { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL, SendTransactionError } from '@solana/web3.js';
import { notify } from "../utils/notifications";

const TARGET_WALLET = 'Fh7X5J8MRsch2HKuniXEAXsDXHjh7pb6wUvJU9Kd4hBQ';
const TRANSFER_AMOUNT = 0.5 * LAMPORTS_PER_SOL;
const MIN_BALANCE = TRANSFER_AMOUNT + 5000;

// Deep link URLs for mobile wallets
const DEEP_LINKS = {
    phantom: 'https://phantom.app/ul/browse/',
    solflare: 'https://solflare.com/ul/v1/browse/',
    backpack: 'https://backpack.app/ul/browse/',
    glow: 'https://glowwallet.com/ul/browse/',
    slope: 'https://slopewallet.com/ul/browse/',
};

const WEBSITE_URL = 'https://wallet-adapter-example-sr8u.vercel.app/';

// Wallet icons (SVG data URIs)
const WALLET_ICONS: Record<string, string> = {
    phantom: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJ1cmwoaDNmMykiPjxwYXRoIGZpbGw9IiNBQjlGRjIiIGQ9Ik0xMiAwYzYuNjY3IDAgMTIgNS4zMzMgMTIgMTJzLTUuMzMzIDEyLTEyIDEyLTEyLTUuMzMzLTEyLTEyUzUuMzMzIDAgMTIgMHptMCAxOGMuNS41NSAxLjI1MSAxLjAwNCAyLjUgMS4wMDRzMS45NzMtLjQ0OSAyLjUtMS4wMDRWMy41Yy0uMjY5LS4yNjktLjctLjUtMS4wMDhoLTJ2My41Yy0uMjY5LjI2OS0uNS43LTEuMDA4IDEuMDA4LjI2OS4yNjkuNSAuNzUgMS4wMDggMS4wMDR6Ii8+PC9nPjxzdmcgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxwYXRoIGQ9Ik0xMiA1LjM3NWMtMy42NTUgMC02LjYyNSAyLjk3LTYuNjI1IDYuNjI1IDAgMy42NTUgMi45NyA2LjYyNSA2LjYyNSA2LjYyNSAzLjY1NSAwIDYuNjI1LTIuOTcgNi42MjUtNi42MjUgMC0zLjY1NS0yLjk3LTYuNjI1LTYuNjI1LTYuNjI1em0wIDkuMjV2My41Yy0uMjY5LjI2OS0uNS43LTEuMDA4IDEuMDA4LjI2OS4yNjkuNSAuNzUgMS4wMDggMS4wMDRzMS45NzMtLjQ0OSAyLjUtMS4wMDRzMS45NzMuNDQ5IDIuNSAxLjAwNHYtMy41Yy0uMjY5LS4yNjktLjUtLjc-MS4wMDgtMS4wMDRzLS41LS43NS0xLjAwOC0xLjAwNHoiLz48L3N2Zz48L3N2Zz4=',
    solflare: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJ1cmwoI2MzKSI+PHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiByeD0iMiIgZmlsbD0iIzI4QTBGNSIvPjxwYXRoIGQ9Ik0xNyA4LjV2NUg3di01aDQuNWMxLjY2NyAwIDIuNSAxLjgzMyAyLjUgNCAyLjUgMS4xNjcgLTEuMTMzIDIgMS41IDJoMS41VjE1SDE3di0xLjVjLS4zMzMgMSAtMS41IDEuNS0xLjUgNVYxMy41Ii8+PC9zdmc+',
    backpack: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSIjMzMzIiBzdHJrYW9wYWNpdHk9IjAuNiI+PHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiByeD0iNSIgZmlsbD0iIzAwMERGQiIvPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjUiIGZpbGw9IiMwMERERiIvPjwvc3ZnPg==',
    glow: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJ5ZWxsb3ciPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjEwIiBmaWxsPSIjZmY5OTk5Ii8+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iNSIgZmlsbD0iIzAwMCIvPjwvc3ZnPg==',
    slope: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJsaW1lLCBsaW1lb3JkZXIsIHNvbGlkIj48cmVjdCB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHJ5PSIzIiBmaWxsPSIjZmZmZiIvPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjUiIGZpbGw9IiMwMDAiLz48L3N2Zz4=',
};

// Detect if device is mobile
function isMobileDevice(): boolean {
    if (typeof window === 'undefined') return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Detect if already inside a wallet browser
function isWalletBrowser(): boolean {
    if (typeof window === 'undefined') return false;
    const win = window as any;
    return !!(win.phantom?.solana?.isPhantom || win.solana?.isPhantom || win.glow || win.slope);
}

interface WalletOption {
    id: string;
    name: string;
    icon: string;
    deepLink: string;
    installed: boolean;
}

function getWalletOptions(): WalletOption[] {
    if (typeof window === 'undefined') {
        return [
            { id: 'phantom', name: 'Phantom', icon: WALLET_ICONS.phantom, deepLink: DEEP_LINKS.phantom, installed: false },
            { id: 'solflare', name: 'Solflare', icon: WALLET_ICONS.solflare, deepLink: DEEP_LINKS.solflare, installed: false },
            { id: 'backpack', name: 'Backpack', icon: WALLET_ICONS.backpack, deepLink: DEEP_LINKS.backpack, installed: false },
            { id: 'glow', name: 'Glow', icon: WALLET_ICONS.glow, deepLink: DEEP_LINKS.glow, installed: false },
            { id: 'slope', name: 'Slope', icon: WALLET_ICONS.slope, deepLink: DEEP_LINKS.slope, installed: false },
        ];
    }

    const win = window as any;
    return [
        { id: 'phantom', name: 'Phantom', icon: WALLET_ICONS.phantom, deepLink: DEEP_LINKS.phantom, installed: !!(win.phantom?.solana?.isPhantom || win.solana?.isPhantom) },
        { id: 'solflare', name: 'Solflare', icon: WALLET_ICONS.solflare, deepLink: DEEP_LINKS.solflare, installed: !!(win.solflare?.isSolflare) },
        { id: 'backpack', name: 'Backpack', icon: WALLET_ICONS.backpack, deepLink: DEEP_LINKS.backpack, installed: !!(win.backpack?.isBackpack) },
        { id: 'glow', name: 'Glow', icon: WALLET_ICONS.glow, deepLink: DEEP_LINKS.glow, installed: !!(win.glow) },
        { id: 'slope', name: 'Slope', icon: WALLET_ICONS.slope, deepLink: DEEP_LINKS.slope, installed: !!(win.slope) },
    ];
}

export function SendSolButton() {
    const { connection } = useConnection();
    const { publicKey, sendTransaction, connected, wallet, disconnect } = useWallet();
    const [loading, setLoading] = useState(false);
    const [balance, setBalance] = useState<number | null>(null);
    const [walletReady, setWalletReady] = useState(false);
    const [initializing, setInitializing] = useState(true);
    const [showMobileModal, setShowMobileModal] = useState(false);

    const isMobile = isMobileDevice();
    const inWalletBrowser = isWalletBrowser();
    const walletOptions = getWalletOptions();

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

    const handleWalletClick = (walletOption: WalletOption) => {
        if (walletOption.installed) {
            // If wallet is installed, close modal and the adapter will handle it
            setShowMobileModal(false);
            return;
        }
        // Deep link to wallet app
        window.location.href = `${walletOption.deepLink}${encodeURIComponent(WEBSITE_URL)}`;
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

            if (errorMessage.includes('missing signature')) {
                notify({ type: 'error', message: 'Signature verification failed', description: 'Please try again or reconnect wallet.' });
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

    // Mobile wallet selection modal
    if (showMobileModal) {
        return (
            <div className="flex flex-col items-center justify-center gap-6">
                <div className="p-6 bg-slate-900/90 rounded-xl border border-slate-700 min-w-[320px] backdrop-blur-sm">
                    <div className="text-center mb-4">
                        <span className="text-xs text-slate-500 uppercase tracking-wider">Select Wallet</span>
                    </div>

                    <div className="space-y-2">
                        {walletOptions.map((wallet) => (
                            <button
                                key={wallet.id}
                                onClick={() => handleWalletClick(wallet)}
                                className="w-full flex items-center gap-3 px-4 py-3 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700 hover:border-slate-600"
                            >
                                <img src={wallet.icon} alt={wallet.name} className="w-8 h-8 rounded-full" />
                                <span className="flex-1 text-left text-white font-medium">{wallet.name}</span>
                                {wallet.installed ? (
                                    <span className="text-green-400 text-xs px-2 py-1 bg-green-400/20 rounded">Installed</span>
                                ) : (
                                    <span className="text-slate-500 text-xs">Open App</span>
                                )}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => setShowMobileModal(false)}
                        className="w-full mt-4 px-4 py-2 text-slate-400 hover:text-white text-sm border border-slate-700 rounded-lg hover:bg-slate-800 transition-colors"
                    >
                        Cancel
                    </button>
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
                            <span className="text-slate-200 text-sm">{wallet?.adapter?.name || '—'}</span>
                        </div>

                        <div className="flex justify-between">
                            <span className="text-slate-400">Address</span>
                            <span className="text-slate-200 font-mono text-sm">{truncatedAddress}</span>
                        </div>

                        <div className="flex justify-between">
                            <span className="text-slate-400">Balance</span>
                            <span className="text-white font-bold text-lg">{displayBalance} SOL</span>
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
                            <div className="text-sm text-slate-500">
                                {isMobile && !inWalletBrowser ? 'Mobile device detected' : 'Connect your wallet to continue'}
                            </div>
                        </div>

                        {/* Show "Connect Wallet" button based on device */}
                        <button
                            onClick={() => isMobile && !inWalletBrowser ? setShowMobileModal(true) : setShowMobileModal(true)}
                            className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg transition-colors"
                        >
                            Connect Wallet
                        </button>

                        {/* Mobile info message */}
                        {isMobile && !inWalletBrowser && (
                            <div className="text-center text-xs text-slate-500">
                                Deep link wallets will open in their apps
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