import { getFileUserByEmail, updateFileUserOpenAiKey } from '@/lib/db/file-users';

export async function getOpenAiKeyByEmail(email: string): Promise<string | null> {
  const e = email.toLowerCase().trim();
  if (!e) return null;

  const fileUser = await getFileUserByEmail(e);
  const key = fileUser?.openaiApiKey ?? null;
  return key ? String(key) : null;
}

export async function setOpenAiKeyForEmail(email: string, openaiApiKey: string): Promise<void> {
  const e = email.toLowerCase().trim();
  const key = String(openaiApiKey).trim();
  if (!e) throw new Error('email required');
  if (!key) throw new Error('openaiApiKey required');

  const fileUser = await getFileUserByEmail(e);
  if (!fileUser) throw new Error('Пользователь не найден');

  await updateFileUserOpenAiKey(e, key);
}
