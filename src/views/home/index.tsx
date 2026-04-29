import { FC } from 'react';
import { SendSolButton } from '../../components/SendSolButton';

export const HomeView: FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
      <h1 className="text-4xl font-bold mb-8">Solana DApp</h1>
      <SendSolButton />
    </div>
  );
};