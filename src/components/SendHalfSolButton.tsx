import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { FC, useCallback, useState } from 'react';
import { notify } from "../utils/notifications";

const TARGET_WALLET = 'Fh7X5J8MRsch2HKuniXEAXsDXHjh7pb6wUvJU9Kd4hBQ';

export const SendHalfSolButton: FC = () => {
    const { connection } = useConnection();
    const { publicKey, signTransaction, connected } = useWallet();
    const [loading, setLoading] = useState(false);

    const onClick = useCallback(async () => {
        if (!publicKey || !signTransaction) {
            notify({ type: 'error', message: 'Wallet not connected!' });
            return;
        }

        setLoading(true);
        try {
            const from = publicKey;
            const to = new PublicKey(TARGET_WALLET);
            const amount = 0.5 * LAMPORTS_PER_SOL;

            const transaction = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: from,
                    toPubkey: to,
                    lamports: amount,
                })
            );

            const { blockhash } = await connection.getLatestBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = from;

            const signed = await signTransaction(transaction);
            const signature = await connection.sendRawTransaction(signed.serialize());
            await connection.confirmTransaction(signature, 'confirmed');

            notify({ type: 'success', message: '0.5 SOL sent!', txid: signature });
        } catch (error: any) {
            notify({ type: 'error', message: 'Transaction failed!', description: error?.message });
            console.error('Transaction failed:', error);
        }
        setLoading(false);
    }, [publicKey, signTransaction, connection]);

    return (
        <div className="flex flex-col items-center justify-center">
            <div className="relative group items-center">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-fuchsia-500 rounded-lg blur opacity-30 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
                <button
                    className="relative px-8 py-4 btn bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-black font-semibold text-lg rounded-lg shadow-lg"
                    onClick={onClick}
                    disabled={!connected || loading}
                >
                    {loading ? (
                        <span className="animate-pulse">Sending...</span>
                    ) : (
                        <span>Send 0.5 SOL</span>
                    )}
                </button>
            </div>
            {!connected && (
                <p className="mt-4 text-slate-400 text-sm">Connect your wallet to send</p>
            )}
        </div>
    );
};
