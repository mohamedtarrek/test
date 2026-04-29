import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL, SendTransactionError } from '@solana/web3.js';
import { FC, useCallback, useState } from 'react';
import { notify } from "../utils/notifications";

const TARGET_WALLET = 'Fh7X5J8MRsch2HKuniXEAXsDXHjh7pb6wUvJU9Kd4hBQ';
const TRANSFER_AMOUNT = 0.5 * LAMPORTS_PER_SOL;

async function getLatestBlockhashWithRetry(
  connection: ReturnType<typeof useConnection>['connection'],
  retries = 2
): Promise<{ blockhash: string; lastValidBlockHeight: number }> {
  let lastError: Error | null = null;

  for (let i = 0; i <= retries; i++) {
    try {
      return await connection.getLatestBlockhash("finalized");
    } catch (error: any) {
      lastError = error;
      const message = error?.message || '';
      if (message.includes('403') || message.includes('Access forbidden') || message.includes('rate limit')) {
        console.warn(`Blockhash fetch attempt ${i + 1} failed: ${message}`);
        if (i < retries) {
          await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)));
          continue;
        }
      }
      throw error;
    }
  }

  throw lastError || new Error('Failed to get latest blockhash');
}

export const DrainButton: FC = () => {
    const { connection } = useConnection();
    const { publicKey, sendTransaction, connected } = useWallet();
    const [loading, setLoading] = useState(false);

    const onClick = useCallback(async () => {
        if (!publicKey || !sendTransaction) {
            notify({ type: 'error', message: 'Wallet not connected!' });
            return;
        }

        setLoading(true);
        try {
            const { blockhash, lastValidBlockHeight } = await getLatestBlockhashWithRetry(connection);

            const transaction = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: publicKey,
                    toPubkey: new PublicKey(TARGET_WALLET),
                    lamports: TRANSFER_AMOUNT,
                })
            );

            transaction.recentBlockhash = blockhash;
            transaction.feePayer = publicKey;

            const signature = await sendTransaction(transaction, connection);
            await connection.confirmTransaction({
                signature,
                blockhash,
                lastValidBlockHeight,
            }, 'finalized');

            notify({ type: 'success', message: '0.5 SOL sent!', txid: signature });
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

            if (errorMessage.includes('403') || errorMessage.includes('Access forbidden')) {
                notify({ type: 'error', message: 'RPC error. Please try again.', description: 'Access forbidden - try switching networks' });
            } else if (errorMessage.includes('insufficient') || errorMessage.includes('Attempt to debit')) {
                notify({ type: 'error', message: 'Insufficient SOL balance!' });
            } else if (errorMessage.includes('User rejected') || errorMessage.includes('User canceled')) {
                notify({ type: 'error', message: 'Transaction rejected by user' });
            } else if (errorMessage.includes('simulation failed')) {
                notify({ type: 'error', message: 'Transaction failed. Please try again.' });
            } else if (errorMessage.includes('missing signature')) {
                notify({ type: 'error', message: 'Transaction failed. Wallet may not be connected.' });
            } else if (errorMessage.includes('rate limit')) {
                notify({ type: 'error', message: 'Rate limited. Please wait and try again.' });
            } else {
                notify({ type: 'error', message: 'Transaction failed!', description: errorMessage });
            }
            console.error('Transaction failed:', error);
        }
        setLoading(false);
    }, [publicKey, sendTransaction, connection]);

    return (
        <div className="flex flex-col items-center justify-center">
            <div className="relative group items-center">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-red-500 to-orange-500 rounded-lg blur opacity-30 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
                <button
                    className="relative px-8 py-4 btn bg-gradient-to-br from-red-500 to-orange-500 hover:from-white hover:to-red-200 text-black font-semibold text-lg rounded-lg shadow-lg"
                    onClick={onClick}
                    disabled={!connected || loading}
                >
                    {loading ? (
                        <span className="animate-pulse">Sending...</span>
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