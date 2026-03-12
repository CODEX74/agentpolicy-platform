import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db/prisma';
import { importPrivateKeyForUser } from '@/lib/wallets/importPrivateKey';
import { z } from 'zod';

const bodySchema = z.object({
  privateKey: z.string().min(1),
  agentId: z.string().optional(),
  networkId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const email = session.user.email;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const body = await req.json();
    const { privateKey, agentId, networkId } = bodySchema.parse(body);

    const wallet = await importPrivateKeyForUser({
      userId: user.id,
      privateKey,
      agentId,
      networkId,
    });

    return NextResponse.json({
      _id: wallet.id,
      userEmail: email,
      agentId: wallet.agentId,
      address: wallet.address,
      networkId: wallet.networkId,
      cdpWalletId: wallet.cdpWalletId,
      isDefault: wallet.isDefault,
      createdAt: wallet.createdAt.toISOString(),
      updatedAt: wallet.updatedAt.toISOString(),
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      const msg = err.errors.map((e) => e.message).join('; ');
      return NextResponse.json({ error: msg || 'Неверные данные' }, { status: 400 });
    }
    console.error('POST /api/wallets/import-private-key', err);
    return NextResponse.json(
      {
        error:
          'Не удалось импортировать приватный ключ. Проверьте настройки сервера и переменные окружения.',
      },
      { status: 500 },
    );
  }
}

