import type { Types } from 'mongoose';

export interface TimeRestrictions {
  enabled: boolean;
  startHour: number;
  endHour: number;
  daysOfWeek: number[];
}

export interface PolicyNotifications {
  email: boolean;
  telegram: boolean;
  onEachTransaction: boolean;
  onLimitExceeded: boolean;
}

export interface IPolicy {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  agentId: Types.ObjectId;
  name: string;
  dailyLimit: number;
  weeklyLimit: number;
  maxPerTransaction: number;
  allowedAddresses: string[];
  blockedAddresses: string[];
  allowedOperations: string[];
  timeRestrictions: TimeRestrictions;
  notifications: PolicyNotifications;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PolicyTemplate {
  id: string;
  name: string;
  description: string;
  dailyLimit: number;
  weeklyLimit: number;
  maxPerTransaction: number;
  allowedOperations: string[];
}
