import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const AGENTS_FILE = path.join(DATA_DIR, 'agents.json');

export interface FileAgent {
  _id: string;
  userEmail: string;
  name: string;
  description: string;
  isActive: boolean;
  walletId?: string;
  walletAddress?: string;
  /** Демо-баланс в USDT (без привязки кошелька). Агент может тратить в рамках политики. */
  demoBalance?: number;
  /** Изначальный демо-баланс (значение, введённое пользователем на сайте). Восстанавливается по /reset. */
  initialDemoBalance?: number;
  /** Автозапуск 24/7 по крону: агент сам принимает решения по расписанию. */
  run24_7?: boolean;
  createdAt: string;
  updatedAt: string;
}

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readAgents(): Promise<FileAgent[]> {
  try {
    await ensureDir();
    const raw = await fs.readFile(AGENTS_FILE, 'utf-8');
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function writeAgents(agents: FileAgent[]) {
  await ensureDir();
  await fs.writeFile(AGENTS_FILE, JSON.stringify(agents, null, 2), 'utf-8');
}

export async function getFileAgentsByEmail(userEmail: string): Promise<FileAgent[]> {
  const agents = await readAgents();
  const lower = userEmail.toLowerCase().trim();
  return agents
    .filter((a) => a.userEmail.toLowerCase() === lower)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function createFileAgent(params: {
  userEmail: string;
  name: string;
  description?: string;
}): Promise<FileAgent> {
  const agents = await readAgents();
  const id = `file-agent-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const now = new Date().toISOString();
  const agent: FileAgent = {
    _id: id,
    userEmail: params.userEmail.toLowerCase().trim(),
    name: params.name.trim(),
    description: (params.description ?? '').trim(),
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
  agents.push(agent);
  await writeAgents(agents);
  return agent;
}

export async function getFileAgentById(id: string, userEmail: string): Promise<FileAgent | null> {
  const agents = await readAgents();
  const lower = userEmail.toLowerCase().trim();
  return agents.find((a) => a._id === id && a.userEmail.toLowerCase() === lower) ?? null;
}

export async function updateFileAgentWallet(
  agentId: string,
  userEmail: string,
  walletId: string | null,
  walletAddress: string | null
): Promise<FileAgent | null> {
  const agents = await readAgents();
  const lower = userEmail.toLowerCase().trim();
  const idx = agents.findIndex((a) => a._id === agentId && a.userEmail.toLowerCase() === lower);
  if (idx < 0) return null;
  agents[idx].walletId = walletId ?? undefined;
  agents[idx].walletAddress = walletAddress ?? undefined;
  agents[idx].updatedAt = new Date().toISOString();
  await writeAgents(agents);
  return agents[idx];
}

export async function setFileAgentDemoBalance(
  agentId: string,
  userEmail: string,
  demoBalance: number
): Promise<FileAgent | null> {
  const agents = await readAgents();
  const lower = userEmail.toLowerCase().trim();
  const idx = agents.findIndex((a) => a._id === agentId && a.userEmail.toLowerCase() === lower);
  if (idx < 0) return null;
  const value = Math.max(0, demoBalance);
  agents[idx].demoBalance = value;
  agents[idx].initialDemoBalance = value; // сохраняем как изначальный для /reset
  agents[idx].updatedAt = new Date().toISOString();
  await writeAgents(agents);
  return agents[idx];
}

/** Агенты с включённым автозапуском 24/7 (для крона). */
export async function getFileAgentsRun24_7(): Promise<FileAgent[]> {
  const agents = await readAgents();
  return agents.filter((a) => a.run24_7 === true && (a.demoBalance ?? 0) > 0);
}

export async function setFileAgentRun24_7(
  agentId: string,
  userEmail: string,
  run24_7: boolean
): Promise<FileAgent | null> {
  const agents = await readAgents();
  const lower = userEmail.toLowerCase().trim();
  const idx = agents.findIndex((a) => a._id === agentId && a.userEmail.toLowerCase() === lower);
  if (idx < 0) return null;
  agents[idx].run24_7 = run24_7;
  agents[idx].updatedAt = new Date().toISOString();
  await writeAgents(agents);
  return agents[idx];
}

/** Восстановить демо-баланс всех агентов пользователя до изначального (после очистки транзакций). */
export async function resetAgentsDemoBalanceForUser(userEmail: string): Promise<void> {
  const agents = await readAgents();
  const lower = userEmail.toLowerCase().trim();
  let changed = false;
  for (let i = 0; i < agents.length; i++) {
    if (agents[i].userEmail.toLowerCase() !== lower) continue;
    let initial = agents[i].initialDemoBalance;
    if (initial == null && (agents[i].demoBalance ?? 0) > 0) {
      initial = agents[i].demoBalance;
      agents[i].initialDemoBalance = initial; // сохраняем текущий как изначальный для следующих /reset
      changed = true;
    }
    if (initial != null && agents[i].demoBalance !== initial) {
      agents[i].demoBalance = initial;
      agents[i].updatedAt = new Date().toISOString();
      changed = true;
    }
  }
  if (changed) await writeAgents(agents);
}
