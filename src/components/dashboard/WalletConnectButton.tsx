'use client';

import { Button } from '@/components/ui/Button';

interface WalletConnectButtonProps {
  onConnect?: () => void;
  address?: string | null;
  isLoading?: boolean;
}

export function WalletConnectButton({ onConnect, address, isLoading }: WalletConnectButtonProps) {
  if (address) {
    const short = `${address.slice(0, 6)}...${address.slice(-4)}`;
    return (
      <Button variant="outline" size="sm" disabled>
        {short}
      </Button>
    );
  }
  return (
    <Button onClick={onConnect} disabled={isLoading} size="sm">
      {isLoading ? 'Подключение...' : 'Подключить кошелёк'}
    </Button>
  );
}
