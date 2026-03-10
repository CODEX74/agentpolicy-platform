export function formatAddress(address: string, chars = 6): string {
  if (!address || address.length < chars * 2) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export function formatEth(wei: bigint | number): string {
  const value = typeof wei === 'bigint' ? Number(wei) / 1e18 : wei;
  return value.toFixed(4);
}

export function formatCurrency(
  value: number,
  currency = 'USDT',
  locale = 'en-US'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency === 'USDT' ? 'USD' : 'USD',
    minimumFractionDigits: 4,
    maximumFractionDigits: 6,
  }).format(value);
}

/**
 * Формат количества монеты без экспоненты (чтобы 2.86e-4 не читалось как 2.86).
 * Для маленьких значений показывает больше знаков после запятой.
 */
export function formatAssetQuantity(qty: number): string {
  if (!Number.isFinite(qty)) return String(qty);
  const abs = Math.abs(qty);
  if (abs === 0) return '0';

  // Подбираем точность так, чтобы не уходить в экспоненту и не терять смысл.
  let decimals = 4;
  if (abs < 1) decimals = 8;
  if (abs < 0.01) decimals = 10;
  if (abs < 0.0001) decimals = 12;

  // Обрезаем хвостовые нули (0.10000000 -> 0.1)
  const s = qty.toFixed(decimals);
  return s.replace(/(\.\d*?[1-9])0+$/u, '$1').replace(/\.0+$/u, '');
}

export function formatDate(date: Date | string, locale = 'ru-RU'): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date));
}
