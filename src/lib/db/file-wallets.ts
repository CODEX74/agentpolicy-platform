import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const WALLETS_FILE = path.join(DATA_DIR, 'wallets.json');

export interface FileWallet {
  _id: string;
  userEmail: string;
  agentId: string | null;
  address: string;
  networkId: string;
  cdpWalletId: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readWallets(): Promise<FileWallet[]> {
  try {
    await ensureDir();
    const raw = await fs.readFile(WALLETS_FILE, 'utf-8');
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function writeWallets(wallets: FileWallet[]) {
  await ensureDir();
  await fs.writeFile(WALLETS_FILE, JSON.stringify(wallets, null, 2), 'utf-8');
}

export async function getFileWalletsByEmail(userEmail: string): Promise<FileWallet[]> {
  const wallets = await readWallets();
  const lower = userEmail.toLowerCase().trim();
  return wallets
    .filter((w) => w.userEmail.toLowerCase() === lower)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export async function getFileWalletById(id: string, userEmail: string): Promise<FileWallet | null> {
  const wallets = await readWallets();
  const lower = userEmail.toLowerCase().trim();
  return wallets.find((w) => w._id === id && w.userEmail.toLowerCase() === lower) ?? null;
}

export async function getFileWalletByAddress(address: string, userEmail: string): Promise<FileWallet | null> {
  const wallets = await readWallets();
  const lower = userEmail.toLowerCase().trim();
  const addr = address.toLowerCase().trim();
  return wallets.find((w) => w.address.toLowerCase() === addr && w.userEmail.toLowerCase() === lower) ?? null;
}

export async function createFileWallet(params: {
  userEmail: string;
  address: string;
  agentId?: string | null;
  networkId?: string;
  cdpWalletId?: string | null;
}): Promise<FileWallet> {
  const wallets = await readWallets();
  const now = new Date().toISOString();
  const id = `file-wallet-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const wallet: FileWallet = {
    _id: id,
    userEmail: params.userEmail.toLowerCase().trim(),
    agentId: params.agentId ?? null,
    address: params.address.toLowerCase().trim(),
    networkId: params.networkId ?? 'base-sepolia',
    cdpWalletId: params.cdpWalletId ?? null,
    isDefault: false,
    createdAt: now,
    updatedAt: now,
  };
  wallets.push(wallet);
  await writeWallets(wallets);
  return wallet;
}

export async function setFileWalletAgentId(
  walletId: string,
  userEmail: string,
  agentId: string | null
): Promise<FileWallet | null> {
  const wallets = await readWallets();
  const lower = userEmail.toLowerCase().trim();
  const idx = wallets.findIndex((w) => w._id === walletId && w.userEmail.toLowerCase() === lower);
  if (idx < 0) return null;
  wallets[idx].agentId = agentId;
  wallets[idx].updatedAt = new Date().toISOString();
  await writeWallets(wallets);
  return wallets[idx];
}
