import { prisma } from '@/lib/db/prisma';

export async function getEmailByTelegramId(telegramId: string): Promise<string | null> {
  const tg = String(telegramId).trim();
  if (!tg) return null;

  const user = await prisma.user.findFirst({ where: { telegramId: tg } });
  return user?.email ?? null;
}

export async function getTelegramIdByEmail(email: string): Promise<string | null> {
  const e = email.toLowerCase().trim();
  if (!e) return null;

  const user = await prisma.user.findUnique({ where: { email: e } });
  return user?.telegramId ?? null;
}

export async function setTelegramIdForEmail(email: string, telegramId: string): Promise<void> {
  const e = email.toLowerCase().trim();
  const tg = String(telegramId).trim();
  if (!e) throw new Error('email required');
  if (!tg) throw new Error('telegramId required');

  await prisma.user.updateMany({
    where: { email: e },
    data: { telegramId: tg },
  });
}
