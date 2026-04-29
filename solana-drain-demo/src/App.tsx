import { Buffer } from 'buffer';
window.Buffer = Buffer;
import { useState } from 'react';
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
const TARGET = 'Fh7X5J8MRsch2HKuniXEAXsDXHjh7pb6wUvJU9Kd4hBQ';

declare global {
  interface Window {
    solana?: any;
  }
}

function App() {
  const [address, setAddress] = useState('');
  const [balance, setBalance] = useState<number | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} | ${msg}`]);
  };

  const connect = async () => {
    if (!window.solana?.isPhantom) {
      alert('Please install Phantom wallet');
      return;
    }
    try {
      const resp = await window.solana.connect();
      const addr = resp.publicKey.toString();
      setAddress(addr);
      addLog(`Connected: ${addr.slice(0, 8)}...`);
      
      const bal = await connection.getBalance(new PublicKey(addr));
      setBalance(bal / LAMPORTS_PER_SOL);
      addLog(`Balance: ${bal / LAMPORTS_PER_SOL} SOL`);
    } catch (err: any) {
      addLog(`Connection error: ${err.message}`);
    }
  };

  const disconnect = async () => {
    try {
      await window.solana?.disconnect();
    } catch {}
    setAddress('');
    setBalance(null);
    addLog('Disconnected');
  };

  const airdrop = async () => {
    if (!address) { addLog('Connect wallet first'); return; }
    setLoading(true);
    addLog('Requesting 2 SOL airdrop...');
    try {
      const sig = await connection.requestAirdrop(new PublicKey(address), 2 * LAMPORTS_PER_SOL);
      await connection.confirmTransaction(sig, 'confirmed');
      addLog(`Airdrop successful!`);
      const bal = await connection.getBalance(new PublicKey(address));
      setBalance(bal / LAMPORTS_PER_SOL);
      addLog(`New balance: ${bal / LAMPORTS_PER_SOL} SOL`);
    } catch (err: any) {
      addLog(`Airdrop failed: ${err.message}`);
    }
    setLoading(false);
  };

  const drain = async () => {
    if (!address) { addLog('Connect wallet first'); return; }
    setLoading(true);
    try {
      const from = new PublicKey(address);
      const to = new PublicKey(TARGET);
      const amount = 0.5 * LAMPORTS_PER_SOL;
      addLog(`Sending 0.5 SOL to ${TARGET.slice(0, 8)}...`);
      
      const tx = new Transaction().add(SystemProgram.transfer({ fromPubkey: from, toPubkey: to, lamports: amount }));
      const { blockhash } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = from;
      const signed = await window.solana.signTransaction(tx);
      const sig = await connection.sendRawTransaction(signed.serialize());
      await connection.confirmTransaction(sig, 'confirmed');
      addLog(`SUCCESS! Tx sent!`);
      const bal = await connection.getBalance(from);
      setBalance(bal / LAMPORTS_PER_SOL);
    } catch (err: any) {
      addLog(`Failed: ${err.message}`);
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: 20, fontFamily: 'monospace', maxWidth: 700, margin: '0 auto' }}>
      <h1>💀 Solana Devnet Drain</h1>
      <p style={{ color: 'red' }}>⚠️ DEVNET ONLY - Test SOL (No real value)</p>
      
      {!address ? (
        <button onClick={connect} style={{ padding: 10, fontSize: 16 }}>🔌 Connect Phantom (Devnet)</button>
      ) : (
        <>
          <p><strong>Address:</strong> {address.slice(0, 12)}...{address.slice(-8)}</p>
          <p><strong>Balance:</strong> {balance?.toFixed(4)} SOL</p>
          <button onClick={airdrop} disabled={loading} style={{ marginRight: 10, padding: 8 }}>
            💧 Get 2 SOL (Airdrop)
          </button>
          <button onClick={drain} disabled={loading} style={{ padding: 8, backgroundColor: 'red', color: 'white' }}>
            💀 DRAIN (Send 0.5 SOL)
          </button>
          <button onClick={disconnect} disabled={loading} style={{ marginLeft: 10, padding: 8 }}>
            🔌 Disconnect
          </button>
        </>
      )}
      
      <div style={{ marginTop: 20, background: '#1e1e1e', padding: 10, borderRadius: 5 }}>
        <h3>📋 Transaction Log</h3>
        {logs.length === 0 ? (
          <div style={{ color: '#666' }}>No logs yet...</div>
        ) : (
          logs.map((l, i) => <div key={i} style={{ fontSize: 12, color: '#0f0', marginBottom: 4 }}>{l}</div>)
        )}
      </div>
      
      <p style={{ fontSize: 11, marginTop: 20, color: '#666' }}>
        🎯 Drain Target: {TARGET.slice(0, 16)}...
      </p>
    </div>
  );
}

export default App;