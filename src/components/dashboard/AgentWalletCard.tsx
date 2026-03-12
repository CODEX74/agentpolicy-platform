'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatAddress } from '@/lib/utils/format';
import { useLang, withLang } from '@/contexts/LanguageContext';
import type { Lang } from '@/contexts/LanguageContext';

const t: Record<
  Lang,
  {
    wallet: string;
    detach: string;
    transactionsHint: string;
    transactions: string;
    transactionsHintAfter: string;
    sendTransfer: string;
    recipientPlaceholder: string;
    send: string;
    notAttached: string;
    selectWallet: string;
    attach: string;
    orEnterAddress: string;
    addAndAttach: string;
    createWallet: string;
    connectInjected: string;
    importPrivateKeyTitle: string;
    importPrivateKeyWarning: string;
    privateKeyPlaceholder: string;
    errLoad: string;
    errNetwork: string;
    errAttach: string;
    errDetach: string;
    errAddress: string;
    errAddWallet: string;
    errAmount: string;
    errSend: string;
    errCreate: string;
    errNoInjectedWallet: string;
    errInjectedRequest: string;
    errPrivateKeyEmpty: string;
    errPrivateKeyInvalid: string;
    errPrivateKeyImport: string;
  }
> = {
  ru: {
    wallet: 'Кошелёк',
    detach: 'Отвязать',
    transactionsHint: 'Транзакции появятся в разделе',
    transactions: 'Транзакции',
    transactionsHintAfter: ' после отправки перевода через приложение (API) или при настройке вебхука CDP.',
    sendTransfer: 'Отправить перевод (нужны CDP)',
    recipientPlaceholder: 'Адрес получателя 0x...',
    send: 'Отправить',
    notAttached: 'Кошелёк не привязан',
    selectWallet: 'Выберите кошелёк',
    attach: 'Привязать',
    orEnterAddress:
      'Подключить существующий кошелёк (Bybit Web3, MetaMask и др.) — введите адрес или импортируйте из браузера',
    addAndAttach: 'Добавить и привязать',
    createWallet: 'Создать кошелёк (CDP)',
    connectInjected: 'Импортировать из MetaMask / Bybit Web3',
    importPrivateKeyTitle: 'Импорт приватного ключа (полный доступ агента)',
    importPrivateKeyWarning:
      'ВНИМАНИЕ: приватный ключ будет сохранён на сервере. Агент и сервер получат полный доступ к средствам на этом кошельке. Используйте только если полностью доверяете приложению.',
    privateKeyPlaceholder: 'Приватный ключ 0x... (только EVM)',
    errLoad: 'Не удалось загрузить кошельки',
    errNetwork: 'Ошибка сети',
    errAttach: 'Не удалось привязать',
    errDetach: 'Не удалось отвязать',
    errAddress: 'Введите адрес кошелька (0x...)',
    errAddWallet: 'Не удалось добавить кошелёк',
    errAmount: 'Введите корректную сумму (USDT)',
    errSend: 'Не удалось отправить. Нужны CDP-ключи.',
    errCreate: 'Не удалось создать кошелёк. Проверьте настройки CDP в .env.local',
    errNoInjectedWallet:
      'Не найден кошелёк в браузере. Установите MetaMask или Bybit Web3 Wallet, либо введите адрес вручную.',
    errInjectedRequest:
      'Не удалось получить адрес из кошелька браузера. Проверьте разрешения и попробуйте ещё раз.',
    errPrivateKeyEmpty: 'Введите приватный ключ кошелька.',
    errPrivateKeyInvalid:
      'Некорректный приватный ключ. Используйте ключ формата 0x... для EVM-кошелька.',
    errPrivateKeyImport:
      'Не удалось импортировать приватный ключ. Проверьте значение и попробуйте ещё раз.',
  },
  en: {
    wallet: 'Wallet',
    detach: 'Detach',
    transactionsHint: 'Transactions will appear in',
    transactions: 'Transactions',
    transactionsHintAfter: ' after sending via app (API) or when CDP webhook is set up.',
    sendTransfer: 'Send transfer (CDP required)',
    recipientPlaceholder: 'Recipient address 0x...',
    send: 'Send',
    notAttached: 'Wallet not linked',
    selectWallet: 'Select wallet',
    attach: 'Attach',
    orEnterAddress:
      'Connect an existing wallet (Bybit Web3, MetaMask, etc.) — enter address or import from browser',
    addAndAttach: 'Add and attach',
    createWallet: 'Create wallet (CDP)',
    connectInjected: 'Import from MetaMask / Bybit Web3',
    importPrivateKeyTitle: 'Import private key (full agent access)',
    importPrivateKeyWarning:
      'WARNING: the private key will be stored on the server. The agent and server will have full control over this wallet. Use only if you fully trust the app.',
    privateKeyPlaceholder: 'Private key 0x... (EVM only)',
    errLoad: 'Failed to load wallets',
    errNetwork: 'Network error',
    errAttach: 'Failed to attach',
    errDetach: 'Failed to detach',
    errAddress: 'Enter wallet address (0x...)',
    errAddWallet: 'Failed to add wallet',
    errAmount: 'Enter a valid amount (USDT)',
    errSend: 'Failed to send. CDP keys required.',
    errCreate: 'Failed to create wallet. Check CDP settings in .env.local',
    errNoInjectedWallet:
      'No browser wallet found. Install MetaMask or Bybit Web3 Wallet, or paste the address manually.',
    errInjectedRequest:
      'Failed to obtain address from browser wallet. Check permissions and try again.',
    errPrivateKeyEmpty: 'Enter a wallet private key.',
    errPrivateKeyInvalid:
      'Invalid private key. Use an 0x-prefixed EVM private key.',
    errPrivateKeyImport:
      'Failed to import private key. Check the value and try again.',
  },
};

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
  const lang = useLang();
  const text = t[lang];
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
  const [privateKey, setPrivateKey] = useState('');

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
        setError(typeof err?.error === 'string' ? err.error : text.errLoad);
      }
    } catch {
      setWallets([]);
      setError(text.errNetwork);
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
        setError(typeof err?.error === 'string' ? err.error : text.errAttach);
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
        setError(typeof err?.error === 'string' ? err.error : text.errDetach);
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
      setError(text.errAddress);
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
        setError(typeof err?.error === 'string' ? err.error : text.errAddWallet);
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

  const handleImportFromInjectedWallet = async () => {
    try {
      if (typeof window === 'undefined') return;
      // MetaMask, Bybit Web3 и другие EVM-кошельки обычно внедряют window.ethereum
      const eth = (window as unknown as { ethereum?: { request?: (args: { method: string }) => Promise<unknown> } })
        .ethereum;
      if (!eth?.request) {
        setError(text.errNoInjectedWallet);
        return;
      }
      const accounts = (await eth.request({ method: 'eth_requestAccounts' })) as string[] | undefined;
      const account = accounts?.[0];
      if (!account) {
        setError(text.errInjectedRequest);
        return;
      }
      setManualAddress(account);
      setError(null);
    } catch {
      setError(text.errInjectedRequest);
    }
  };

  const handleSendTransaction = async () => {
    const to = sendToAddress.trim();
    const amount = sendAmountEth.trim();
    if (!to || !amount || !attachedAddress) return;
    const amountNum = parseFloat(amount);
    if (Number.isNaN(amountNum) || amountNum <= 0) {
      setError(text.errAmount);
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
        setError(typeof data?.error === 'string' ? data.error : text.errSend);
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
        setError(typeof err?.error === 'string' ? err.error : text.errCreate);
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

  const handleImportPrivateKey = async () => {
    const pk = privateKey.trim();
    if (!pk) {
      setError(text.errPrivateKeyEmpty);
      return;
    }
    // Very basic validation: EVM private keys are typically 64 hex chars (32 bytes), with optional 0x prefix.
    const cleaned = pk.startsWith('0x') ? pk.slice(2) : pk;
    if (cleaned.length < 64) {
      setError(text.errPrivateKeyInvalid);
      return;
    }

    setError(null);
    setActionLoading(true);
    try {
      const res = await fetch('/api/wallets/import-private-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ privateKey: pk, agentId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data?.error === 'string' ? data.error : text.errPrivateKeyImport);
        return;
      }
      const wallet = data;
      setAttachedWalletId(wallet._id);
      setAttachedAddress(wallet.address);
      setPrivateKey('');
      await fetchWallets();
    } finally {
      setActionLoading(false);
    }
  };

  const availableWallets = wallets.filter((w) => w._id !== attachedWalletId);

  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-medium">{text.wallet}</h3>
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
                {text.detach}
              </Button>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {text.transactionsHint}{' '}
              <Link href={withLang('/dashboard/transactions', lang)} className="underline hover:no-underline">
                {text.transactions}
              </Link>
              {text.transactionsHintAfter}
            </p>
            <div className="space-y-2 border-t border-zinc-200 pt-4 dark:border-zinc-700">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {text.sendTransfer}
              </label>
              <div className="flex flex-wrap items-end gap-2">
                <Input
                  type="text"
                  placeholder={text.recipientPlaceholder}
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
                  {text.send}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{text.notAttached}</p>
        )}

        {!attachedAddress && (
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
              value={selectedWalletId}
              onChange={(e) => setSelectedWalletId(e.target.value)}
              disabled={loading || actionLoading}
            >
              <option value="">{text.selectWallet}</option>
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
              {text.attach}
            </Button>
          </div>
        )}

        {!attachedAddress && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {text.orEnterAddress}
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
                  {text.addAndAttach}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={actionLoading}
                  onClick={handleImportFromInjectedWallet}
                >
                  {text.connectInjected}
                </Button>
              </div>
            </div>

            <div className="space-y-2 rounded-md border border-red-300 bg-red-50 p-3 dark:border-red-500/60 dark:bg-red-950/40">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                  {text.importPrivateKeyTitle}
                </p>
                <p className="text-xs text-red-700/90 dark:text-red-300/90">
                  {text.importPrivateKeyWarning}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  type="password"
                  placeholder={text.privateKeyPlaceholder}
                  value={privateKey}
                  onChange={(e) => setPrivateKey(e.target.value)}
                  disabled={actionLoading}
                  className="font-mono max-w-xs"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!privateKey.trim() || actionLoading}
                  onClick={handleImportPrivateKey}
                >
                  {text.importPrivateKeyTitle}
                </Button>
              </div>
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
            {text.createWallet}
          </Button>
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </CardContent>
    </Card>
  );
}
