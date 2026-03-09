import { safeDbConnect } from '@/lib/db/mongoose';
import User from '@/lib/db/models/User';
import { getFileUserByEmail, updateFileUserOpenAiKey } from '@/lib/db/file-users';

export async function getOpenAiKeyByEmail(email: string): Promise<string | null> {
  const e = email.toLowerCase().trim();
  if (!e) return null;

  const fileUser = await getFileUserByEmail(e);
  if (fileUser) return (fileUser.openaiApiKey ?? null) ? String(fileUser.openaiApiKey) : null;

  const db = await safeDbConnect();
  if (!db) return null;
  const user = await User.findOne({ email: e }).lean();
  const key = (user?.openaiApiKey as string | null | undefined) ?? null;
  return key ? String(key) : null;
}

export async function setOpenAiKeyForEmail(email: string, openaiApiKey: string): Promise<void> {
  const e = email.toLowerCase().trim();
  const key = String(openaiApiKey).trim();
  if (!e) throw new Error('email required');
  if (!key) throw new Error('openaiApiKey required');

  const fileUser = await getFileUserByEmail(e);
  if (fileUser) {
    await updateFileUserOpenAiKey(e, key);
    return;
  }

  const db = await safeDbConnect();
  if (!db) throw new Error('db unavailable');
  await User.updateOne({ email: e }, { $set: { openaiApiKey: key } }).exec();
}

