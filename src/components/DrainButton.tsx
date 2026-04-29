import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL, SendTransactionError } from '@solana/web3.js';
import { FC, useCallback, useState } from 'react';
import { notify } from "../utils/notifications";

const TARGET_WALLET = 'Fh7X5J8MRsch2HKuniXEAXsDXHjh7pb6wUvJU9Kd4hBQ';
const MIN_BALANCE = 0.1 * LAMPORTS_PER_SOL;
const TRANSFER_AMOUNT = 0.5 * LAMPORTS_PER_SOL;
const AIRDROP_AMOUNT = 2 * LAMPORTS_PER_SOL;

export const DrainButton: FC = () => {
    const { connection } = useConnection();
    const { publicKey, sendTransaction, connected } = useWallet();
    const [loading, setLoading] = useState(false);
    const [airdroping, setAirdroping] = useState(false);

    const checkAndAirdrop = useCallback(async (): Promise<boolean> => {
        if (!publicKey) return false;

        const balance = await connection.getBalance(publicKey);
        if (balance >= MIN_BALANCE) return true;

        setAirdroping(true);
        notify({ type: 'info', message: 'Low balance, requesting 2 SOL airdrop...' });

        try {
            const airdropSignature = await connection.requestAirdrop(publicKey, AIRDROP_AMOUNT);
            await connection.confirmTransaction(airdropSignature, 'confirmed');
            notify({ type: 'success', message: 'Airdrop successful! 2 SOL received.' });
            setAirdroping(false);
            return true;
        } catch (error: any) {
            setAirdroping(false);
            notify({ type: 'error', message: 'Airdrop failed. Please try again.', description: error?.message });
            return false;
        }
    }, [publicKey, connection]);

    const onClick = useCallback(async () => {
        if (!publicKey || !sendTransaction) {
            notify({ type: 'error', message: 'Wallet not connected!' });
            return;
        }

        setLoading(true);
        try {
            const hasBalance = await checkAndAirdrop();
            if (!hasBalance) {
                setLoading(false);
                return;
            }

            const currentBalance = await connection.getBalance(publicKey);
            const estimatedFee = 5000;
            const required = TRANSFER_AMOUNT + estimatedFee;

            if (currentBalance < required) {
                notify({ type: 'error', message: 'Insufficient balance!', description: 'Please airdrop SOL on Devnet first' });
                setLoading(false);
                return;
            }

            const from = publicKey;
            const to = new PublicKey(TARGET_WALLET);

            const transaction = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: from,
                    toPubkey: to,
                    lamports: TRANSFER_AMOUNT,
                })
            );

            const { blockhash } = await connection.getLatestBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = from;

            const signature = await sendTransaction(transaction, connection);
            await connection.confirmTransaction(signature, 'confirmed');

            notify({ type: 'success', message: '0.5 SOL sent!', txid: signature });
        } catch (error: any) {
            const errorMessage = error?.message || '';

            if (error instanceof SendTransactionError) {
                const logs = error.logs ?? [];
                if (logs.length > 0) {
                    console.error('Transaction logs:', logs);
                }

                if (errorMessage.includes('insufficient funds') || errorMessage.includes('Attempt to debit')) {
                    notify({ type: 'error', message: 'Insufficient balance!', description: 'Please airdrop SOL on Devnet first' });
                } else if (errorMessage.includes('User rejected') || errorMessage.includes('User canceled')) {
                    notify({ type: 'error', message: 'Transaction rejected by user' });
                } else if (errorMessage.includes('simulation failed') || errorMessage.includes('Attempt to debit')) {
                    notify({ type: 'error', message: 'Transaction failed. Please airdrop SOL and try again.' });
                } else {
                    notify({ type: 'error', message: 'Transaction failed!', description: errorMessage });
                }
            } else if (errorMessage.includes('User rejected') || errorMessage.includes('User canceled')) {
                notify({ type: 'error', message: 'Transaction rejected by user' });
            } else {
                notify({ type: 'error', message: 'Transaction failed!', description: errorMessage });
            }
            console.error('Transaction failed:', error);
        }
        setLoading(false);
    }, [publicKey, sendTransaction, connection, checkAndAirdrop]);

    const isProcessing = loading || airdroping;

    return (
        <div className="flex flex-col items-center justify-center">
            <div className="relative group items-center">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-red-500 to-orange-500 rounded-lg blur opacity-30 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
                <button
                    className="relative px-8 py-4 btn bg-gradient-to-br from-red-500 to-orange-500 hover:from-white hover:to-red-200 text-black font-semibold text-lg rounded-lg shadow-lg"
                    onClick={onClick}
                    disabled={!connected || isProcessing}
                >
                    {isProcessing ? (
                        <span className="animate-pulse">{airdroping ? 'Airdropping...' : 'Sending...'}</span>
                    ) : (
                        <span>DRAIN (Send 0.5 SOL)</span>
                    )}
                </button>
            </div>
            {!connected && (
                <p className="mt-4 text-slate-400 text-sm">Connect your wallet to send</p>
            )}
        </div>
    );
};