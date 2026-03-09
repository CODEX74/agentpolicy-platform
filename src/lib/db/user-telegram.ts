import { safeDbConnect } from '@/lib/db/mongoose';
import User from '@/lib/db/models/User';
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
  if (fileUser?.email) return fileUser.email;

  const db = await safeDbConnect();
  if (!db) return null;
  const user = await User.findOne({ telegramId: tg }).lean();
  return user?.email ?? null;
}

/** Получить telegram chat_id по email пользователя. */
export async function getTelegramIdByEmail(email: string): Promise<string | null> {
  const e = email.toLowerCase().trim();
  if (!e) return null;

  const fileUser = await getFileUserByEmail(e);
  if (fileUser?.telegramId) return String(fileUser.telegramId);

  const db = await safeDbConnect();
  if (!db) return null;
  const user = await User.findOne({ email: e }).lean();
  return (user?.telegramId as string | undefined | null) ?? null;
}

/** Привязать telegram chat_id к пользователю (file user или MongoDB user). */
export async function setTelegramIdForEmail(email: string, telegramId: string): Promise<void> {
  const e = email.toLowerCase().trim();
  const tg = String(telegramId).trim();
  if (!e) throw new Error('email required');
  if (!tg) throw new Error('telegramId required');

  const fileUser = await getFileUserByEmail(e);
  if (fileUser) {
    await updateFileUserTelegramId(e, tg);
    return;
  }

  const db = await safeDbConnect();
  if (!db) throw new Error('db unavailable');
  await User.updateOne({ email: e }, { $set: { telegramId: tg } }).exec();
}

