'use client';

import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/Button';
import { WalletConnectButton } from '@/components/dashboard/WalletConnectButton';

export function WalletAuth() {
  const handleConnect = () => {
    signIn('credentials', { redirect: true, callbackUrl: '/dashboard' });
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Подключите кошелёк для входа
      </p>
      <WalletConnectButton onConnect={handleConnect} />
    </div>
  );
}
