'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatAddress } from '@/lib/utils/format';

interface WalletItem {
  _id: string;
  address: string;
  agentId?: string | null;
  networkId?: string;
}

interface AgentWalletCardProps {
  agentId: string;
  currentWalletId?: string | null;
  currentWalletAddress?: string | null;
}

export function AgentWalletCard({
  agentId,
  currentWalletId,
  currentWalletAddress,
}: AgentWalletCardProps) {
  const [wallets, setWallets] = useState<WalletItem[]>([]);
  const [selectedWalletId, setSelectedWalletId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualAddress, setManualAddress] = useState('');
  const [sendToAddress, setSendToAddress] = useState('');
  const [sendAmountEth, setSendAmountEth] = useState('');
  const [attachedWalletId, setAttachedWalletId] = useState<string | null>(currentWalletId ?? null);
  const [attachedAddress, setAttachedAddress] = useState<string | null>(currentWalletAddress ?? null);

  useEffect(() => {
    setAttachedWalletId(currentWalletId ?? null);
    setAttachedAddress(currentWalletAddress ?? null);
  }, [currentWalletId, currentWalletAddress]);

  const fetchWallets = async () => {
    try {
      const res = await fetch('/api/wallets');
      if (res.ok) {
        const data = await res.json();
        setWallets(Array.isArray(data) ? data : []);
        setError(null);
      } else {
        const err = await res.json().catch(() => ({}));
        setError(typeof err?.error === 'string' ? err.error : 'Не удалось загрузить кошельки');
      }
    } catch {
      setWallets([]);
      setError('Ошибка сети');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWallets();
  }, []);

  const handleAttach = async () => {
    if (!selectedWalletId) return;
    setError(null);
    setActionLoading(true);
    try {
      const res = await fetch(`/api/agents/${agentId}/wallet`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletId: selectedWalletId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(typeof err?.error === 'string' ? err.error : 'Не удалось привязать');
        return;
      }
      const data = await res.json();
      const walletId = typeof data.walletId === 'object' ? data.walletId?._id : data.walletId;
      const addr = typeof data.walletId === 'object' ? data.walletId?.address : data.address ?? data.walletAddress;
      setAttachedWalletId(walletId ?? selectedWalletId);
      setAttachedAddress(addr ?? wallets.find((w) => w._id === selectedWalletId)?.address ?? null);
      setSelectedWalletId('');
      await fetchWallets();
    } finally {
      setActionLoading(false);
    }
  };

  const handleDetach = async () => {
    setError(null);
    setActionLoading(true);
    try {
      const res = await fetch(`/api/agents/${agentId}/wallet`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(typeof err?.error === 'string' ? err.error : 'Не удалось отвязать');
        return;
      }
      setAttachedWalletId(null);
      setAttachedAddress(null);
      await fetchWallets();
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddByAddress = async () => {
    const addr = manualAddress.trim();
    if (!addr) {
      setError('Введите адрес кошелька (0x...)');
      return;
    }
    setError(null);
    setActionLoading(true);
    try {
      const res = await fetch('/api/wallets/add-address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: addr, agentId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(typeof err?.error === 'string' ? err.error : 'Не удалось добавить кошелёк');
        return;
      }
      const wallet = await res.json();
      setAttachedWalletId(wallet._id);
      setAttachedAddress(wallet.address);
      setManualAddress('');
      await fetchWallets();
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendTransaction = async () => {
    const to = sendToAddress.trim();
    const amount = sendAmountEth.trim();
    if (!to || !amount || !attachedAddress) return;
    const amountNum = parseFloat(amount);
    if (Number.isNaN(amountNum) || amountNum <= 0) {
      setError('Введите корректную сумму (USDT)');
      return;
    }
    const valueWei = BigInt(Math.round(amountNum * 1e18)).toString();
    setError(null);
    setActionLoading(true);
    try {
      const res = await fetch('/api/wallets/transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromAddress: attachedAddress,
          toAddress: to,
          valueWei,
          agentId,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data?.error === 'string' ? data.error : 'Не удалось отправить. Нужны CDP-ключи.');
        return;
      }
      setSendToAddress('');
      setSendAmountEth('');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateWallet = async () => {
    setError(null);
    setActionLoading(true);
    try {
      const res = await fetch('/api/wallets/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(typeof err?.error === 'string' ? err.error : 'Не удалось создать кошелёк. Проверьте настройки CDP в .env.local');
        return;
      }
      const wallet = await res.json();
      setAttachedWalletId(wallet._id);
      setAttachedAddress(wallet.address);
      setSelectedWalletId('');
      await fetchWallets();
    } finally {
      setActionLoading(false);
    }
  };

  const availableWallets = wallets.filter((w) => w._id !== attachedWalletId);

  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-medium">Кошелёк</h3>
      </CardHeader>
      <CardContent className="space-y-4">
        {attachedAddress ? (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm text-zinc-700 dark:text-zinc-300">
                {formatAddress(attachedAddress)}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={actionLoading}
                onClick={handleDetach}
              >
                Отвязать
              </Button>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Транзакции появятся в разделе{' '}
              <Link href="/dashboard/transactions" className="underline hover:no-underline">
                Транзакции
              </Link>
              {' '}после отправки перевода через приложение (API) или при настройке вебхука CDP.
            </p>
            <div className="space-y-2 border-t border-zinc-200 pt-4 dark:border-zinc-700">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Отправить перевод (нужны CDP)
              </label>
              <div className="flex flex-wrap items-end gap-2">
                <Input
                  type="text"
                  placeholder="Адрес получателя 0x..."
                  value={sendToAddress}
                  onChange={(e) => setSendToAddress(e.target.value)}
                  disabled={actionLoading}
                  className="font-mono max-w-[220px]"
                />
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.001"
                  value={sendAmountEth}
                  onChange={(e) => setSendAmountEth(e.target.value)}
                  disabled={actionLoading}
                  className="w-24"
                />
                <span className="text-sm text-zinc-500">USDT</span>
                <Button
                  type="button"
                  size="sm"
                  disabled={!sendToAddress.trim() || !sendAmountEth.trim() || actionLoading}
                  onClick={handleSendTransaction}
                >
                  Отправить
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Кошелёк не привязан</p>
        )}

        {!attachedAddress && (
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
              value={selectedWalletId}
              onChange={(e) => setSelectedWalletId(e.target.value)}
              disabled={loading || actionLoading}
            >
              <option value="">Выберите кошелёк</option>
              {availableWallets.map((w) => (
                <option key={w._id} value={w._id}>
                  {formatAddress(w.address)}
                </option>
              ))}
            </select>
            <Button
              type="button"
              size="sm"
              disabled={!selectedWalletId || actionLoading}
              onClick={handleAttach}
            >
              Привязать
            </Button>
          </div>
        )}

        {!attachedAddress && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Или введите адрес кошелька (без CDP)
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                type="text"
                placeholder="0x..."
                value={manualAddress}
                onChange={(e) => setManualAddress(e.target.value)}
                disabled={actionLoading}
                className="font-mono max-w-xs"
              />
              <Button
                type="button"
                size="sm"
                disabled={!manualAddress.trim() || actionLoading}
                onClick={handleAddByAddress}
              >
                Добавить и привязать
              </Button>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={actionLoading}
            onClick={handleCreateWallet}
          >
            Создать кошелёк (CDP)
          </Button>
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </CardContent>
    </Card>
  );
}
