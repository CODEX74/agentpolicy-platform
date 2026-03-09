import type { IPolicy } from '@/types/policy';

export interface TransactionToValidate {
  amount: number;
  to: string;
  type?: string;
}

export function validateTransactionAgainstPolicy(
  policy: IPolicy,
  transaction: TransactionToValidate
): { allowed: boolean; reason?: string } {
  if (!policy.isActive) return { allowed: true };

  if (policy.maxPerTransaction > 0 && transaction.amount > policy.maxPerTransaction) {
    return { allowed: false, reason: 'Transaction amount exceeds maximum allowed' };
  }

  if (policy.allowedAddresses?.length) {
    const toLower = transaction.to.toLowerCase();
    if (!policy.allowedAddresses.some((a) => a.toLowerCase() === toLower)) {
      return { allowed: false, reason: 'Destination address not in whitelist' };
    }
  }

  if (policy.blockedAddresses?.length) {
    const toLower = transaction.to.toLowerCase();
    if (policy.blockedAddresses.some((a) => a.toLowerCase() === toLower)) {
      return { allowed: false, reason: 'Destination address is blocked' };
    }
  }

  if (policy.allowedOperations?.length && !policy.allowedOperations.includes('all')) {
    const type = transaction.type ?? 'transfer';
    if (!policy.allowedOperations.includes(type)) {
      return { allowed: false, reason: `Operation type "${type}" is not allowed` };
    }
  }

  if (policy.timeRestrictions?.enabled) {
    const now = new Date();
    const h = now.getHours();
    const d = now.getDay();
    const { startHour, endHour, daysOfWeek } = policy.timeRestrictions;
    if (h < startHour || h > endHour) return { allowed: false, reason: 'Outside allowed hours' };
    if (daysOfWeek?.length && !daysOfWeek.includes(d)) return { allowed: false, reason: 'Not allowed on this day' };
  }

  return { allowed: true };
}
