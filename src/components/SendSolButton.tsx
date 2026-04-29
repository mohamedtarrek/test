import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL, SendTransactionError } from '@solana/web3.js';
import { FC, useCallback, useState, useEffect, useRef } from 'react';
import { notify } from "../utils/notifications";

const TARGET_WALLET = 'Fh7X5J8MRsch2HKuniXEAXsDXHjh7pb6wUvJU9Kd4hBQ';
const TRANSFER_AMOUNT = 0.5 * LAMPORTS_PER_SOL;
const MIN_BALANCE = TRANSFER_AMOUNT + 5000;

export const SendSolButton: FC = () => {
    const { connection } = useConnection();
    const { publicKey, sendTransaction, connected, wallet } = useWallet();
    const [loading, setLoading] = useState(false);
    const [balance, setBalance] = useState<number | null>(null);
    const [walletReady, setWalletReady] = useState(false);
    const lastPubKeyRef = useRef<string | null>(null);
    const lastAdapterRef = useRef<string | null>(null);

    // Validate wallet is truly connected and get adapter info
    useEffect(() => {
        const pubKeyStr = publicKey?.toBase58() || null;
        const adapterName = wallet?.adapter?.name || 'unknown';

        // Detect actual changes
        if (pubKeyStr !== lastPubKeyRef.current || adapterName !== lastAdapterRef.current) {
            lastPubKeyRef.current = pubKeyStr;
            lastAdapterRef.current = adapterName;
            setWalletReady(false);
            setBalance(null);

            if (pubKeyStr) {
                // Test authorization by fetching balance
                connection.getBalance(publicKey!)
                    .then((bal) => {
                        setBalance(bal / LAMPORTS_PER_SOL);
                        setWalletReady(true);
                    })
                    .catch(() => {
                        setWalletReady(false);
                    });
            }
        }
    }, [publicKey, wallet, connection]);

    const onClick = useCallback(async () => {
        // Validate all prerequisites
        if (!connected || !publicKey) {
            notify({ type: 'error', message: 'Please connect your wallet first.' });
            return;
        }

        if (!sendTransaction) {
            notify({ type: 'error', message: 'Wallet does not support transactions.' });
            return;
        }

        // Get fresh balance from Devnet
        let currentBalanceLamports: number;
        try {
            currentBalanceLamports = await connection.getBalance(publicKey);
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
            // Create transfer instruction
            const transferInstruction = SystemProgram.transfer({
                fromPubkey: publicKey,
                toPubkey: new PublicKey(TARGET_WALLET),
                lamports: TRANSFER_AMOUNT,
            });

            // Create transaction
            const transaction = new Transaction();

            // CRITICAL: Add instruction BEFORE setting feePayer
            transaction.add(transferInstruction);

            // CRITICAL: feePayer MUST be the connected wallet's publicKey
            transaction.feePayer = publicKey;

            // CRITICAL: Get fresh blockhash from Devnet
            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("finalized");
            transaction.recentBlockhash = blockhash;

            // Debug: Verify transaction before sending
            console.log('=== Transaction Debug ===');
            console.log('feePayer:', transaction.feePayer?.toBase58());
            console.log('wallet publicKey:', publicKey.toBase58());
            console.log('fromPubkey (in instruction):', publicKey.toBase58());
            console.log('toPubkey:', TARGET_WALLET);
            console.log('amount:', TRANSFER_AMOUNT, 'lamports (0.5 SOL)');
            console.log('recentBlockhash:', blockhash);
            console.log('wallet adapter:', wallet?.adapter?.name || 'unknown');
            console.log('=========================');

            // Use sendTransaction from wallet adapter
            // This internally calls signTransaction with the correct key
            const signature = await sendTransaction(transaction, connection);

            // Confirm on Devnet
            await connection.confirmTransaction({
                signature,
                blockhash,
                lastValidBlockHeight,
            }, 'finalized');

            notify({ type: 'success', message: '0.5 SOL sent successfully!', txid: signature });

            // Refresh balance
            const newBalanceLamports = await connection.getBalance(publicKey);
            setBalance(newBalanceLamports / LAMPORTS_PER_SOL);

        } catch (error: unknown) {
            let errorMessage = error instanceof Error ? error.message : String(error);
            let logs: string[] = [];

            if (error instanceof SendTransactionError) {
                logs = error.logs ?? [];
                errorMessage = error.message;
            }

            console.error('Transaction failed:', { errorMessage, logs });

            if (errorMessage.includes('missing signature')) {
                notify({
                    type: 'error',
                    message: 'Signature verification failed',
                    description: 'Wallet may be connected incorrectly. Please disconnect and reconnect your wallet, then try again.'
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
    }, [publicKey, sendTransaction, connection, wallet]);

    const isWalletReady = walletReady && connected;

    return (
        <div className="flex flex-col items-center justify-center gap-6">
            {/* Status Card */}
            <div className="p-6 bg-slate-900/50 rounded-xl border border-slate-700 min-w-[320px]">
                <div className="text-center mb-4">
                    <span className="text-xs text-slate-500 uppercase tracking-wider">Solana Devnet</span>
                </div>

                <div className="space-y-3">
                    <div className="flex justify-between">
                        <span className="text-slate-400">Wallet</span>
                        <span className={isWalletReady ? 'text-green-400' : 'text-yellow-400'}>
                            {isWalletReady ? 'Connected' : 'Not Ready'}
                        </span>
                    </div>

                    <div className="flex justify-between">
                        <span className="text-slate-400">Adapter</span>
                        <span className="text-slate-200 text-sm">
                            {wallet?.adapter?.name || '—'}
                        </span>
                    </div>

                    <div className="flex justify-between">
                        <span className="text-slate-400">Address</span>
                        <span className="text-slate-200 font-mono text-sm">
                            {publicKey ? `${publicKey.toBase58().slice(0, 8)}...${publicKey.toBase58().slice(-8)}` : '—'}
                        </span>
                    </div>

                    <div className="flex justify-between">
                        <span className="text-slate-400">Balance</span>
                        <span className="text-white font-bold text-lg">
                            {balance !== null ? `${balance.toFixed(4)} SOL` : '—'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Send Button */}
            <button
                className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold rounded-lg min-w-[200px] disabled:cursor-not-allowed"
                onClick={onClick}
                disabled={!isWalletReady || loading}
            >
                {loading ? 'Processing...' : 'Send 0.5 SOL'}
            </button>

            {!connected && (
                <p className="text-red-400 text-sm">Please connect your wallet first.</p>
            )}
        </div>
    );
};