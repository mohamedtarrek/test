import { FC } from 'react';
import { SendHalfSolButton } from '../../components/SendHalfSolButton';

export const HomeView: FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
      <SendHalfSolButton />
    </div>
  );
};
