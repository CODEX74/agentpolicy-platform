import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const POLICIES_FILE = path.join(DATA_DIR, 'policies.json');

export interface FilePolicy {
  _id: string;
  userEmail: string;
  agentId: string;
  name: string;
  dailyLimit: number;
  weeklyLimit: number;
  maxPerTransaction: number;
  allowedOperations: string[];
  timeRestrictions?: {
    enabled: boolean;
    startHour: number;
    endHour: number;
  };
  notifications: {
    email: boolean;
    telegram: boolean;
    onEachTransaction: boolean;
    onLimitExceeded: boolean;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readPolicies(): Promise<FilePolicy[]> {
  try {
    await ensureDir();
    const raw = await fs.readFile(POLICIES_FILE, 'utf-8');
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function writePolicies(policies: FilePolicy[]) {
  await ensureDir();
  await fs.writeFile(POLICIES_FILE, JSON.stringify(policies, null, 2), 'utf-8');
}

export async function getFilePoliciesByEmail(
  userEmail: string,
  agentId?: string
): Promise<FilePolicy[]> {
  const policies = await readPolicies();
  const lower = userEmail.toLowerCase().trim();
  return policies
    .filter(
      (p) =>
        p.userEmail.toLowerCase() === lower &&
        (agentId == null || p.agentId === agentId)
    )
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export async function upsertFilePolicy(params: {
  userEmail: string;
  agentId: string;
  name?: string;
  dailyLimit?: number;
  weeklyLimit?: number;
  maxPerTransaction?: number;
  allowedOperations?: string[];
  timeRestrictions?: { enabled?: boolean; startHour?: number; endHour?: number };
  notifications?: {
    email?: boolean;
    telegram?: boolean;
    onEachTransaction?: boolean;
    onLimitExceeded?: boolean;
  };
  isActive?: boolean;
}): Promise<FilePolicy> {
  const policies = await readPolicies();
  const email = params.userEmail.toLowerCase().trim();
  const existing = policies.findIndex(
    (p) => p.userEmail.toLowerCase() === email && p.agentId === params.agentId
  );
  const now = new Date().toISOString();
  const defaultNotifications = {
    email: true,
    telegram: false,
    onEachTransaction: true,
    onLimitExceeded: true,
  };
  const policy: FilePolicy = {
    _id:
      existing >= 0
        ? policies[existing]._id
        : `file-policy-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    userEmail: email,
    agentId: params.agentId,
    name: params.name ?? 'Default Policy',
    dailyLimit: params.dailyLimit ?? 0,
    weeklyLimit: params.weeklyLimit ?? 0,
    maxPerTransaction: params.maxPerTransaction ?? 0,
    allowedOperations: params.allowedOperations ?? ['transfer'],
    timeRestrictions: params.timeRestrictions
      ? {
          enabled: params.timeRestrictions.enabled ?? false,
          startHour: params.timeRestrictions.startHour ?? 0,
          endHour: params.timeRestrictions.endHour ?? 23,
        }
      : { enabled: false, startHour: 0, endHour: 23 },
    notifications: {
      ...defaultNotifications,
      ...(params.notifications ?? {}),
    },
    isActive: params.isActive ?? true,
    createdAt: existing >= 0 ? policies[existing].createdAt : now,
    updatedAt: now,
  };
  if (existing >= 0) {
    policies[existing] = policy;
  } else {
    policies.push(policy);
  }
  await writePolicies(policies);
  return policy;
}
