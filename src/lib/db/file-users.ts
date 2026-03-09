import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

export interface FileUser {
  id: string;
  email: string;
  name: string;
  password: string;
  /** Telegram chat id для уведомлений и команд бота */
  telegramId?: string | null;
  /** Персональный ключ OpenAI (ChatGPT) для вызовов AI */
  openaiApiKey?: string | null;
  /** Тариф: free | pro | enterprise. enterprise = безлимит навсегда. */
  plan?: string;
  /** Окончание подписки (ISO). null = бессрочно. */
  subscriptionExpiresAt?: string | null;
  createdAt: string;
}

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readUsers(): Promise<FileUser[]> {
  try {
    await ensureDir();
    const raw = await fs.readFile(USERS_FILE, 'utf-8');
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function writeUsers(users: FileUser[]) {
  await ensureDir();
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
}

export async function getFileUserByEmail(email: string): Promise<FileUser | null> {
  const users = await readUsers();
  const lower = email.toLowerCase().trim();
  return users.find((u) => u.email.toLowerCase() === lower) ?? null;
}

export async function createFileUser(params: {
  email: string;
  name: string;
  password: string;
}): Promise<FileUser> {
  const users = await readUsers();
  const lower = params.email.toLowerCase().trim();
  if (users.some((u) => u.email.toLowerCase() === lower)) {
    throw new Error('Пользователь с таким email уже зарегистрирован');
  }
  const id = `file-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const user: FileUser = {
    id,
    email: lower,
    name: params.name.trim() || lower.split('@')[0],
    password: params.password,
    telegramId: null,
    openaiApiKey: null,
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  await writeUsers(users);
  return user;
}

/** Создать или обновить пользователя при OAuth (Google и т.д.). Пароль — случайный, вход только через провайдера. */
export async function upsertFileUserFromOAuth(params: {
  email: string;
  name: string;
}): Promise<FileUser> {
  const users = await readUsers();
  const lower = params.email.toLowerCase().trim();
  const existing = users.findIndex((u) => u.email.toLowerCase() === lower);
  const id = existing >= 0 ? users[existing].id : `file-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const now = new Date().toISOString();
  const randomPassword = `oauth-${crypto.randomBytes(32).toString('hex')}`;
  const user: FileUser = {
    id,
    email: lower,
    name: params.name.trim() || lower.split('@')[0],
    password: randomPassword,
    telegramId: existing >= 0 ? (users[existing].telegramId ?? null) : null,
    openaiApiKey: existing >= 0 ? (users[existing].openaiApiKey ?? null) : null,
    plan: existing >= 0 ? (users[existing].plan ?? 'free') : 'free',
    subscriptionExpiresAt: existing >= 0 ? users[existing].subscriptionExpiresAt ?? null : null,
    createdAt: existing >= 0 ? users[existing].createdAt : now,
  };
  if (existing >= 0) {
    users[existing] = { ...users[existing], name: user.name };
  } else {
    users.push(user);
  }
  await writeUsers(users);
  return existing >= 0 ? users[existing] : user;
}

/** Создать или обновить пользователя (для сида премиум-аккаунтов). */
export async function upsertFileUser(params: {
  email: string;
  name: string;
  password: string;
  plan?: string;
  subscriptionExpiresAt?: string | null;
}): Promise<FileUser> {
  const users = await readUsers();
  const lower = params.email.toLowerCase().trim();
  const existing = users.findIndex((u) => u.email.toLowerCase() === lower);
  const id = existing >= 0 ? users[existing].id : `file-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const now = new Date().toISOString();
  const user: FileUser = {
    id,
    email: lower,
    name: params.name.trim() || lower.split('@')[0],
    password: params.password,
    telegramId: existing >= 0 ? (users[existing].telegramId ?? null) : null,
    openaiApiKey: existing >= 0 ? (users[existing].openaiApiKey ?? null) : null,
    plan: params.plan ?? 'free',
    subscriptionExpiresAt: params.subscriptionExpiresAt ?? null,
    createdAt: existing >= 0 ? users[existing].createdAt : now,
  };
  if (existing >= 0) {
    users[existing] = user;
  } else {
    users.push(user);
  }
  await writeUsers(users);
  return user;
}

export async function updateFileUserName(email: string, name: string): Promise<FileUser | null> {
  const users = await readUsers();
  const lower = email.toLowerCase().trim();
  const idx = users.findIndex((u) => u.email.toLowerCase() === lower);
  if (idx < 0) return null;
  users[idx].name = name.trim() || lower.split('@')[0];
  await writeUsers(users);
  return users[idx];
}

export async function updateFileUserPassword(email: string, passwordHash: string): Promise<FileUser | null> {
  const users = await readUsers();
  const lower = email.toLowerCase().trim();
  const idx = users.findIndex((u) => u.email.toLowerCase() === lower);
  if (idx < 0) return null;
  users[idx].password = passwordHash;
  await writeUsers(users);
  return users[idx];
}

export async function updateFileUserPlan(email: string, plan: string): Promise<FileUser | null> {
  const users = await readUsers();
  const lower = email.toLowerCase().trim();
  const idx = users.findIndex((u) => u.email.toLowerCase() === lower);
  if (idx < 0) return null;
  users[idx].plan = plan;
  await writeUsers(users);
  return users[idx];
}

export async function getFileUserByTelegramId(telegramId: string): Promise<FileUser | null> {
  const users = await readUsers();
  const tg = String(telegramId).trim();
  if (!tg) return null;
  return users.find((u) => String(u.telegramId ?? '').trim() === tg) ?? null;
}

export async function updateFileUserTelegramId(email: string, telegramId: string): Promise<FileUser | null> {
  const users = await readUsers();
  const lower = email.toLowerCase().trim();
  const idx = users.findIndex((u) => u.email.toLowerCase() === lower);
  if (idx < 0) return null;
  users[idx].telegramId = String(telegramId).trim();
  await writeUsers(users);
  return users[idx];
}

export async function updateFileUserOpenAiKey(email: string, openaiApiKey: string): Promise<FileUser | null> {
  const users = await readUsers();
  const lower = email.toLowerCase().trim();
  const idx = users.findIndex((u) => u.email.toLowerCase() === lower);
  if (idx < 0) return null;
  users[idx].openaiApiKey = String(openaiApiKey).trim();
  await writeUsers(users);
  return users[idx];
}
