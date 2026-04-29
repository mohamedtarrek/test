import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL, SendTransactionError } from '@solana/web3.js';
import { FC, useCallback, useState, useEffect, useRef } from 'react';
import { notify } from "../utils/notifications";

const TARGET_WALLET = 'Fh7X5J8MRsch2HKuniXEAXsDXHjh7pb6wUvJU9Kd4hBQ';
const TRANSFER_AMOUNT = 0.5 * LAMPORTS_PER_SOL;
const MIN_BALANCE = TRANSFER_AMOUNT + 5000; // 0.5 SOL + fees

export const SendSolButton: FC = () => {
    const { connection } = useConnection();
    const { publicKey, sendTransaction, connected } = useWallet();
    const [loading, setLoading] = useState(false);
    const [balance, setBalance] = useState<number | null>(null);
    const [balanceLoading, setBalanceLoading] = useState(false);
    const [walletAuthorized, setWalletAuthorized] = useState(false);
    const lastPublicKeyRef = useRef<string | null>(null);

    // Fetch balance from Devnet
    const fetchBalance = useCallback(async (walletPubKey: PublicKey) => {
        try {
            const balanceLamports = await connection.getBalance(walletPubKey);
            return balanceLamports / LAMPORTS_PER_SOL;
        } catch (error) {
            console.error('Failed to fetch balance:', error);
            return null;
        }
    }, [connection]);

    // Validate wallet authorization (prevents mobile phantom ghost connection issue)
    const validateWallet = useCallback(async (walletPubKey: PublicKey): Promise<boolean> => {
        try {
            // Try to get balance - if this fails, wallet is not properly authorized
            await connection.getBalance(walletPubKey);
            return true;
        } catch {
            return false;
        }
    }, [connection]);

    // Update wallet authorization state when publicKey changes
    useEffect(() => {
        const walletKey = publicKey?.toBase58() || null;

        // Detect if publicKey actually changed (not just re-render)
        if (walletKey !== lastPublicKeyRef.current) {
            lastPublicKeyRef.current = walletKey;
            setWalletAuthorized(false);
            setBalance(null);

            if (walletKey) {
                // Validate wallet on Devnet
                validateWallet(publicKey!).then((isValid) => {
                    setWalletAuthorized(isValid);
                    if (isValid) {
                        fetchBalance(publicKey!).then((bal) => {
                            if (bal !== null) setBalance(bal);
                        });
                    }
                });
            }
        }
    }, [publicKey, validateWallet, fetchBalance]);

    const onClick = useCallback(async () => {
        // Strict validation
        if (!connected || !publicKey) {
            notify({ type: 'error', message: 'Please make sure your wallet is connected correctly before continuing.' });
            return;
        }

        if (!sendTransaction) {
            notify({ type: 'error', message: 'Wallet does not support transactions.' });
            return;
        }

        setLoading(true);
        setBalanceLoading(true);

        try {
            // Fresh balance check directly from Devnet
            const currentBalanceLamports = await connection.getBalance(publicKey);
            const currentBalanceSOL = currentBalanceLamports / LAMPORTS_PER_SOL;
            setBalance(currentBalanceSOL);
            setBalanceLoading(false);

            // Validate balance before transaction
            if (currentBalanceLamports < MIN_BALANCE) {
                notify({
                    type: 'error',
                    message: 'Insufficient balance on Devnet wallet',
                    description: `Current balance: ${currentBalanceSOL.toFixed(4)} SOL. Required: 0.5 SOL + fees.`
                });
                setLoading(false);
                return;
            }

            const transaction = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: publicKey,
                    toPubkey: new PublicKey(TARGET_WALLET),
                    lamports: TRANSFER_AMOUNT,
                })
            );

            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("finalized");
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = publicKey;

            const signature = await sendTransaction(transaction, connection);

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
            setBalanceLoading(false);
            let errorMessage = '';
            let logs: string[] = [];

            if (error instanceof SendTransactionError) {
                logs = error.logs ?? [];
                errorMessage = error.message;
            } else if (error instanceof Error) {
                errorMessage = error.message;
            }

            if (logs.length > 0) {
                console.error('Transaction logs:', logs);
            }

            if (errorMessage.includes('User rejected') || errorMessage.includes('User canceled') || errorMessage.includes('rejected')) {
                notify({ type: 'error', message: 'Transaction rejected by user' });
            } else if (errorMessage.includes('insufficient') || errorMessage.includes('Attempt to debit') || errorMessage.includes('not enough')) {
                notify({ type: 'error', message: 'Insufficient balance on Devnet wallet' });
            } else if (errorMessage.includes('missing signature') || errorMessage.includes('signed by')) {
                notify({ type: 'error', message: 'Wallet signature failed. Please try again.' });
            } else if (errorMessage.includes('simulation failed')) {
                notify({ type: 'error', message: 'Transaction simulation failed. Please try again.' });
            } else {
                notify({ type: 'error', message: 'Transaction failed', description: errorMessage });
            }
            console.error('Transaction failed:', error);
        }
        setLoading(false);
    }, [publicKey, sendTransaction, connection]);

    const isWalletReady = connected && publicKey && walletAuthorized;
    const displayBalance = balance !== null ? balance.toFixed(4) : '—';
    const truncatedAddress = publicKey ? `${publicKey.toBase58().slice(0, 8)}...${publicKey.toBase58().slice(-8)}` : '—';

    return (
        <div className="flex flex-col items-center justify-center gap-6">
            {/* Connection Status Card */}
            <div className="flex flex-col items-center gap-3 p-6 bg-slate-900/50 rounded-xl border border-slate-700 min-w-[320px]">
                <div className="text-xs text-slate-500 uppercase tracking-wider">Connection Status</div>

                <div className="flex items-center gap-3">
                    <span className="text-slate-400 text-sm">Network:</span>
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded font-semibold text-sm">Devnet</span>
                </div>

                <div className="flex items-center gap-3">
                    <span className="text-slate-400 text-sm">Wallet:</span>
                    <span className={`px-2 py-1 rounded font-semibold text-sm ${connected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {connected ? 'CONNECTED' : 'DISCONNECTED'}
                    </span>
                </div>

                <div className="flex items-center gap-3">
                    <span className="text-slate-400 text-sm">Address:</span>
                    <span className="text-slate-200 font-mono text-sm">{truncatedAddress}</span>
                </div>

                <div className="flex items-center gap-3">
                    <span className="text-slate-400 text-sm">Balance:</span>
                    <span className={`font-bold text-xl ${balance !== null ? 'text-white' : 'text-slate-500'}`}>
                        {balanceLoading ? (
                            <span className="animate-pulse">Loading...</span>
                        ) : (
                            `${displayBalance} SOL`
                        )}
                    </span>
                </div>

                {!walletAuthorized && connected && (
                    <div className="mt-2 p-2 bg-yellow-500/20 border border-yellow-500/50 rounded text-yellow-400 text-xs text-center">
                        Wallet not fully authorized. Please reconnect.
                    </div>
                )}
            </div>

            {/* Send Button */}
            <div className="relative group items-center">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg blur opacity-30 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
                <button
                    className="relative px-8 py-4 btn bg-gradient-to-br from-indigo-500 to-purple-500 hover:from-white hover:to-indigo-200 text-black font-semibold text-lg rounded-lg shadow-lg min-w-[220px] touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={onClick}
                    disabled={!isWalletReady || loading || balanceLoading}
                    style={{
                        WebkitTapHighlightColor: 'transparent',
                        touchAction: 'manipulation',
                    }}
                >
                    {loading ? (
                        <span className="animate-pulse">Processing...</span>
                    ) : (
                        <span>Send 0.5 SOL</span>
                    )}
                </button>
            </div>

            {/* Status Messages */}
            {!connected && (
                <p className="text-red-400 text-sm text-center">Please connect your wallet to continue.</p>
            )}
            {connected && !walletAuthorized && (
                <p className="text-yellow-400 text-sm text-center">Please switch to Devnet and reconnect your wallet.</p>
            )}
        </div>
    );
};