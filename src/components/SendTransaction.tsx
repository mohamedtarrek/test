import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { SystemProgram, Transaction, TransactionSignature } from '@solana/web3.js';
import { FC, useCallback } from 'react';
import { notify } from "../utils/notifications";

export const SendTransaction: FC = () => {
    const { connection } = useConnection();
    const { publicKey, sendTransaction } = useWallet();

    const onClick = useCallback(async () => {
        if (!publicKey) {
            notify({ type: 'error', message: 'Wallet not connected!' });
            console.log('error', 'Send Transaction: Wallet not connected!');
            return;
        }

        let signature: TransactionSignature = '';

        try {
            // Latest blockhash
            const latestBlockhash = await connection.getLatestBlockhash();

            // Create transaction (LEGACY - stable with Phantom)
            const transaction = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: publicKey,
                    toPubkey: publicKey, // (ملاحظة: الأفضل تغيّرها لعنوان حقيقي)
                    lamports: 1_000_000,
                })
            );

            transaction.feePayer = publicKey;
            transaction.recentBlockhash = latestBlockhash.blockhash;

            // Send transaction (wallet will SIGN هنا)
            signature = await sendTransaction(transaction, connection, {
                skipPreflight: false,
                preflightCommitment: 'confirmed',
            });

            // Confirm transaction
            await connection.confirmTransaction(
                {
                    signature,
                    ...latestBlockhash,
                },
                'confirmed'
            );

            console.log('signature:', signature);

            notify({
                type: 'success',
                message: 'Transaction successful!',
                txid: signature,
            });

        } catch (error: any) {
            notify({
                type: 'error',
                message: 'Transaction failed!',
                description: error?.message,
                txid: signature,
            });

            console.log('error', 'Transaction failed!', error?.message, signature);
        }
    }, [publicKey, connection, sendTransaction]);

    return (
        <div className="flex flex-row justify-center">
            <div className="relative group items-center">
                <div className="m-1 absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-fuchsia-500 
                rounded-lg blur opacity-20 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt"></div>

                <button
                    className="group w-60 m-2 btn animate-pulse bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-black"
                    onClick={onClick}
                    disabled={!publicKey}
                >
                    <div className="hidden group-disabled:block">
                        Wallet not connected
                    </div>

                    <span className="block group-disabled:hidden">
                        Send Transaction
                    </span>
                </button>
            </div>
        </div>
    );
};