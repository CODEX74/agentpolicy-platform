import { prisma } from '@/lib/db/prisma';

export async function getOpenAiKeyByEmail(email: string): Promise<string | null> {
  const e = email.toLowerCase().trim();
  if (!e) return null;

  const user = await prisma.user.findUnique({ where: { email: e } });
  const key = user?.openaiApiKey ?? null;
  return key ? String(key) : null;
}

export async function setOpenAiKeyForEmail(email: string, openaiApiKey: string): Promise<void> {
  const e = email.toLowerCase().trim();
  const key = String(openaiApiKey).trim();
  if (!e) throw new Error('email required');
  if (!key) throw new Error('openaiApiKey required');

  await prisma.user.updateMany({
    where: { email: e },
    data: { openaiApiKey: key },
  });
}
