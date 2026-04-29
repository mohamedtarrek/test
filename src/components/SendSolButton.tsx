import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL, SendTransactionError } from '@solana/web3.js';
import { FC, useCallback, useState, useEffect, useRef } from 'react';
import { notify } from "../utils/notifications";

const TARGET_WALLET = 'Fh7X5J8MRsch2HKuniXEAXsDXHjh7pb6wUvJU9Kd4hBQ';
const TRANSFER_AMOUNT = 0.5 * LAMPORTS_PER_SOL;
const MIN_BALANCE = TRANSFER_AMOUNT + 5000;

export const SendSolButton: FC = () => {
    const { connection } = useConnection();
    const { publicKey, sendTransaction, connected } = useWallet();
    const [loading, setLoading] = useState(false);
    const [balance, setBalance] = useState<number | null>(null);
    const [walletReady, setWalletReady] = useState(false);
    const lastPubKeyRef = useRef<string | null>(null);

    // Validate wallet is truly connected and can sign
    useEffect(() => {
        const pubKeyStr = publicKey?.toBase58() || null;

        if (pubKeyStr !== lastPubKeyRef.current) {
            lastPubKeyRef.current = pubKeyStr;
            setWalletReady(false);

            if (pubKeyStr) {
                // Test if wallet can actually authorize (fetch balance)
                connection.getBalance(publicKey!)
                    .then(() => setWalletReady(true))
                    .catch(() => setWalletReady(false));
            }
        }
    }, [publicKey, connection]);

    const onClick = useCallback(async () => {
        // Step 1: Validate wallet is fully connected
        if (!connected || !publicKey) {
            notify({ type: 'error', message: 'Wallet not connected! Please connect your wallet first.' });
            return;
        }

        if (!sendTransaction) {
            notify({ type: 'error', message: 'Wallet does not support sendTransaction.' });
            return;
        }

        // Step 2: Check balance on Devnet
        let currentBalanceLamports: number;
        try {
            currentBalanceLamports = await connection.getBalance(publicKey);
        } catch (error) {
            notify({ type: 'error', message: 'Failed to fetch wallet balance. Please reconnect wallet.' });
            return;
        }

        const currentBalanceSOL = currentBalanceLamports / LAMPORTS_PER_SOL;

        if (currentBalanceLamports < MIN_BALANCE) {
            notify({
                type: 'error',
                message: 'Insufficient balance on Devnet wallet',
                description: `Need 0.5 SOL + fees. Current: ${currentBalanceSOL.toFixed(4)} SOL`
            });
            return;
        }

        setLoading(true);

        try {
            // Step 3: Create the transfer instruction
            const transferInstruction = SystemProgram.transfer({
                fromPubkey: publicKey,       // MUST be connected wallet's key
                toPubkey: new PublicKey(TARGET_WALLET),
                lamports: TRANSFER_AMOUNT,
            });

            // Step 4: Create transaction and add instruction
            const transaction = new Transaction().add(transferInstruction);

            // Step 5: Set feePayer to connected wallet's publicKey
            // THIS IS CRITICAL - feePayer must match the signing wallet
            transaction.feePayer = publicKey;

            // Step 6: Fetch fresh blockhash from Devnet
            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("finalized");
            transaction.recentBlockhash = blockhash;

            // Step 7: Log transaction details for debugging
            console.log('Transaction Details:', {
                feePayer: transaction.feePayer?.toBase58(),
                fromPubkey: publicKey.toBase58(),
                toPubkey: TARGET_WALLET,
                amount: TRANSFER_AMOUNT,
                recentBlockhash: blockhash,
            });

            // Step 8: Send via wallet adapter - it handles signing automatically
            // DO NOT call signTransaction manually!
            const signature = await sendTransaction(transaction, connection);

            // Step 9: Confirm transaction on Devnet
            await connection.confirmTransaction({
                signature,
                blockhash,
                lastValidBlockHeight,
            }, 'finalized');

            notify({ type: 'success', message: '0.5 SOL sent successfully!', txid: signature });

            // Refresh balance
            const newBalance = await connection.getBalance(publicKey);
            setBalance(newBalance / LAMPORTS_PER_SOL);

        } catch (error: unknown) {
            let errorMessage = '';
            let logs: string[] = [];

            if (error instanceof SendTransactionError) {
                logs = error.logs ?? [];
                errorMessage = error.message;
            } else if (error instanceof Error) {
                errorMessage = error.message;
            }

            console.error('Transaction failed:', { errorMessage, logs });

            if (errorMessage.includes('missing signature')) {
                notify({ type: 'error', message: 'Wallet signature failed. Please reconnect wallet and try again.' });
            } else if (errorMessage.includes('insufficient')) {
                notify({ type: 'error', message: 'Insufficient balance on Devnet wallet' });
            } else if (errorMessage.includes('User rejected') || errorMessage.includes('rejected')) {
                notify({ type: 'error', message: 'Transaction rejected by user' });
            } else {
                notify({ type: 'error', message: 'Transaction failed', description: errorMessage });
            }
        }

        setLoading(false);
    }, [publicKey, sendTransaction, connection]);

    const displayBalance = balance !== null ? balance.toFixed(4) : '—';

    return (
        <div className="flex flex-col items-center justify-center gap-6">
            {/* Status Card */}
            <div className="p-6 bg-slate-900/50 rounded-xl border border-slate-700 min-w-[320px]">
                <div className="text-center mb-4">
                    <span className="text-xs text-slate-500 uppercase">Devnet Wallet</span>
                </div>

                <div className="space-y-3">
                    <div className="flex justify-between">
                        <span className="text-slate-400">Status</span>
                        <span className={walletReady ? 'text-green-400' : 'text-yellow-400'}>
                            {walletReady ? 'Ready' : 'Not Ready'}
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
                        <span className="text-white font-bold text-lg">{displayBalance} SOL</span>
                    </div>
                </div>
            </div>

            {/* Send Button */}
            <button
                className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold rounded-lg min-w-[200px] disabled:cursor-not-allowed"
                onClick={onClick}
                disabled={!walletReady || loading}
            >
                {loading ? 'Processing...' : 'Send 0.5 SOL'}
            </button>

            {!walletReady && connected && (
                <p className="text-yellow-400 text-sm">Wallet not fully ready. Please reconnect.</p>
            )}
        </div>
    );
};