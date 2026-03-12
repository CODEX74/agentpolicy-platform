'use client';

import { useEffect, useState } from 'react';
import { useLang } from '@/contexts/LanguageContext';
import type { Lang } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PendingRealTransactions } from './PendingRealTransactions';

type RealWalletInfo = {
  address: string | null;
  balanceWei: string;
  network: string | null;
  asset: string | null;
  isViewOnly: boolean;
  realTradingEnabled: boolean;
  realMaxPositionUsd: number | null;
  realDailyLimitUsd: number | null;
  realNotes: string | null;
};

const t = {
  ru: {
    title: 'Реальный кошелёк агента',
    addressLabel: 'Адрес кошелька',
    networkLabel: 'Сеть',
    balanceLabel: 'Баланс (raw, тестовый)',
    copy: 'Скопировать',
    copied: 'Скопировано',
    notCreated: 'Кошелёк ещё не создан. Он создаётся автоматически при создании агента в режиме «Подключить свой кошелёк».',
    viewOnlyNotice:
      'Подключённый кошелёк: агент создаёт заявки на сделки, исполнение — по вашей подписи в кошельке (MetaMask и т.п.) в блоке ниже.',
    tradingTitle: 'Автотрейдинг реальными средствами',
    enableLabel: 'Включить торговлю реальными средствами',
    maxPosition: 'Максимальная позиция на один актив, USDC',
    dailyLimit: 'Дневной лимит по сделкам, USDC',
    notesLabel: 'Комментарий / предупреждение',
    save: 'Сохранить настройки',
    saving: 'Сохранение…',
    saved: 'Сохранено',
    errorLoad: 'Не удалось загрузить данные кошелька',
    errorSave: 'Не удалось сохранить настройки',
    riskTitle: 'Подтверждение риска',
    riskText:
      'Я понимаю, что агент будет совершать реальные сделки с этим кошельком в автоматическом режиме в пределах указанных лимитов.',
    riskConfirm: 'Я понимаю риск и соглашаюсь с автоматической торговлей.',
  },
  en: {
    title: 'Agent real wallet',
    addressLabel: 'Wallet address',
    networkLabel: 'Network',
    balanceLabel: 'Balance (raw, test)',
    copy: 'Copy',
    copied: 'Copied',
    notCreated:
      'Wallet is not created yet. It is created automatically when the agent is created in “Connect your wallet” mode.',
    viewOnlyNotice:
      'Connected wallet: the agent creates trade requests; execution requires your signature in the wallet (MetaMask etc.) in the section below.',
    tradingTitle: 'Autotrading with real funds',
    enableLabel: 'Enable trading with real funds',
    maxPosition: 'Max position per asset, USDC',
    dailyLimit: 'Daily trading limit, USDC',
    notesLabel: 'Comment / warning',
    save: 'Save settings',
    saving: 'Saving…',
    saved: 'Saved',
    errorLoad: 'Failed to load wallet data',
    errorSave: 'Failed to save settings',
    riskTitle: 'Risk confirmation',
    riskText:
      'I understand that the agent will execute real trades from this wallet automatically within the configured limits.',
    riskConfirm: 'I understand the risk and agree to automatic trading.',
  },
};

export function RealWalletCard({ agentId }: { agentId: string }) {
  const lang = useLang();
  const text = t[lang as Lang];
  const [info, setInfo] = useState<RealWalletInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [enable, setEnable] = useState(false);
  const [maxPosition, setMaxPosition] = useState<string>('');
  const [dailyLimit, setDailyLimit] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [riskChecked, setRiskChecked] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/agents/${agentId}/real-wallet`);
        if (!res.ok) {
          throw new Error('failed');
        }
        const data = (await res.json()) as {
          address: string | null;
          balanceWei: string;
          network: string | null;
          asset: string | null;
          isViewOnly?: boolean;
          realTradingEnabled: boolean;
          realMaxPositionUsd: number | null;
          realDailyLimitUsd: number | null;
          realNotes: string | null;
        };
        if (cancelled) return;
        const next: RealWalletInfo = {
          address: data.address,
          balanceWei: data.balanceWei,
          network: data.network,
          asset: data.asset,
          isViewOnly: data.isViewOnly ?? false,
          realTradingEnabled: data.realTradingEnabled,
          realMaxPositionUsd: data.realMaxPositionUsd,
          realDailyLimitUsd: data.realDailyLimitUsd,
          realNotes: data.realNotes,
        };
        setInfo(next);
        setEnable(next.realTradingEnabled);
        setMaxPosition(next.realMaxPositionUsd != null ? String(next.realMaxPositionUsd) : '');
        setDailyLimit(next.realDailyLimitUsd != null ? String(next.realDailyLimitUsd) : '');
        setNotes(next.realNotes ?? '');
      } catch {
        if (!cancelled) setError(text.errorLoad);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [agentId, text.errorLoad]);

  const handleCopy = async () => {
    if (!info?.address) return;
    try {
      await navigator.clipboard.writeText(info.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  const handleSave = async () => {
    if (!info) return;
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        realTradingEnabled: enable && riskChecked,
      };
      body.realMaxPositionUsd = maxPosition ? Number(maxPosition) : null;
      body.realDailyLimitUsd = dailyLimit ? Number(dailyLimit) : null;
      body.realNotes = notes || null;

      const res = await fetch(`/api/agents/${agentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        throw new Error('failed');
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError(text.errorSave);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-medium">{text.title}</h3>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {loading && <p>{text.saving}</p>}
        {error && <p className="text-red-600 dark:text-red-400">{error}</p>}
        {!loading && info && !info.address && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{text.notCreated}</p>
        )}
        {!loading && info && info.address && (
          <>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium uppercase tracking-wide">
                  {text.addressLabel}
                </label>
                <Button type="button" size="sm" variant="outline" onClick={handleCopy}>
                  {copied ? text.copied : text.copy}
                </Button>
              </div>
              <p className="break-all rounded-md bg-zinc-100 px-3 py-2 text-xs text-zinc-800 dark:bg-zinc-900 dark:text-zinc-100">
                {info.address}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide">{text.networkLabel}</p>
                <p className="text-xs text-zinc-700 dark:text-zinc-300">
                  {info.network ?? 'base'} / {info.asset ?? 'USDC'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide">{text.balanceLabel}</p>
                <p className="text-xs text-zinc-700 dark:text-zinc-300">{info.balanceWei}</p>
              </div>
            </div>
            {info.isViewOnly && (
              <>
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-100">
                  {text.viewOnlyNotice}
                </div>
                <div className="border-t border-zinc-200 pt-4 dark:border-zinc-800">
                  <PendingRealTransactions agentId={agentId} />
                </div>
              </>
            )}
            <div className="mt-4 space-y-2 border-t border-zinc-200 pt-4 dark:border-zinc-800">
              <h4 className="text-sm font-semibold">{text.tradingTitle}</h4>
              <label className="flex items-start gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={enable}
                  onChange={(e) => setEnable(e.target.checked)}
                />
                <span>{text.enableLabel}</span>
              </label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium">{text.maxPosition}</label>
                  <Input
                    value={maxPosition}
                    onChange={(e) => setMaxPosition(e.target.value)}
                    placeholder="100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium">{text.dailyLimit}</label>
                  <Input
                    value={dailyLimit}
                    onChange={(e) => setDailyLimit(e.target.value)}
                    placeholder="500"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">{text.notesLabel}</label>
                <textarea
                  className="min-h-[60px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
              <div
                className={`mt-2 space-y-1 rounded-md p-3 text-xs dark:bg-amber-900/20 dark:text-amber-100 ${
                  info.isViewOnly
                    ? 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                    : 'bg-amber-50 text-amber-900'
                }`}
              >
                <div className="font-semibold">{text.riskTitle}</div>
                <p>{text.riskText}</p>
                <label className="mt-1 flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={riskChecked}
                    onChange={(e) => setRiskChecked(e.target.checked)}
                  />
                  <span>{text.riskConfirm}</span>
                </label>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSave}
                  disabled={saving || !info.address}
                >
                  {saving ? text.saving : text.save}
                </Button>
                {saved && (
                  <span className="text-xs text-emerald-600 dark:text-emerald-300">
                    {text.saved}
                  </span>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

