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

export function formatDate(date: Date | string, locale = 'ru-RU'): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date));
}
