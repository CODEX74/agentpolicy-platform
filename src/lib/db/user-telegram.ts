import {
  getFileUserByEmail,
  getFileUserByTelegramId,
  updateFileUserTelegramId,
} from '@/lib/db/file-users';

/** Найти email пользователя по telegram chat_id. */
export async function getEmailByTelegramId(telegramId: string): Promise<string | null> {
  const tg = String(telegramId).trim();
  if (!tg) return null;

  const fileUser = await getFileUserByTelegramId(tg);
  return fileUser?.email ?? null;
}

/** Получить telegram chat_id по email пользователя. */
export async function getTelegramIdByEmail(email: string): Promise<string | null> {
  const e = email.toLowerCase().trim();
  if (!e) return null;

  const fileUser = await getFileUserByEmail(e);
  return fileUser?.telegramId ? String(fileUser.telegramId) : null;
}

/** Привязать telegram chat_id к пользователю. */
export async function setTelegramIdForEmail(email: string, telegramId: string): Promise<void> {
  const e = email.toLowerCase().trim();
  const tg = String(telegramId).trim();
  if (!e) throw new Error('email required');
  if (!tg) throw new Error('telegramId required');

  const fileUser = await getFileUserByEmail(e);
  if (!fileUser) throw new Error('Пользователь не найден');

  await updateFileUserTelegramId(e, tg);
}
