import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL, SendTransactionError } from '@solana/web3.js';
import { FC, useCallback, useState } from 'react';
import { notify } from "../utils/notifications";

const TARGET_WALLET = 'Fh7X5J8MRsch2HKuniXEAXsDXHjh7pb6wUvJU9Kd4hBQ';
const TRANSFER_AMOUNT = 0.5 * LAMPORTS_PER_SOL;

export const SendSolButton: FC = () => {
    const { connection } = useConnection();
    const { publicKey, sendTransaction, connected } = useWallet();
    const [loading, setLoading] = useState(false);

    const onClick = useCallback(async () => {
        if (!publicKey || !sendTransaction) {
            notify({ type: 'error', message: 'Wallet not connected! Please connect your wallet first.' });
            return;
        }

        setLoading(true);
        try {
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
        } catch (error: unknown) {
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
                notify({ type: 'error', message: 'Insufficient SOL balance' });
            } else if (errorMessage.includes('missing signature') || errorMessage.includes('signed by')) {
                notify({ type: 'error', message: 'Wallet signature failed. Please try again.' });
            } else if (errorMessage.includes('simulation failed')) {
                notify({ type: 'error', message: 'Transaction simulation failed. Please try again.' });
            } else if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
                notify({ type: 'error', message: 'Transaction timed out. Please try again.' });
            } else {
                notify({ type: 'error', message: 'Transaction failed', description: errorMessage });
            }
            console.error('Transaction failed:', error);
        }
        setLoading(false);
    }, [publicKey, sendTransaction, connection]);

    return (
        <div className="flex flex-col items-center justify-center">
            <div className="relative group items-center">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg blur opacity-30 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
                <button
                    className="relative px-8 py-4 btn bg-gradient-to-br from-indigo-500 to-purple-500 hover:from-white hover:to-indigo-200 text-black font-semibold text-lg rounded-lg shadow-lg min-w-[200px] touch-manipulation"
                    onClick={onClick}
                    disabled={!connected || loading}
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
            {!connected && (
                <p className="mt-4 text-slate-400 text-sm text-center">Connect your wallet to send SOL</p>
            )}
        </div>
    );
};