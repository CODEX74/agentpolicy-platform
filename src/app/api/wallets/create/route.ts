import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';

const createSchema = z.object({
  agentId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const email = session.user.email;
    const body = await req.json().catch(() => ({}));
    const { agentId } = createSchema.parse(body);

    const networkId = process.env.NETWORK_ID ?? 'base-sepolia';
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Optional app-level quota: limit CDP-created wallets per user (cdpWalletId != null).
    const maxPerUser = Number(process.env.CDP_MAX_WALLETS_PER_USER ?? '5');
    if (Number.isFinite(maxPerUser) && maxPerUser > 0) {
      const existingCount = await prisma.wallet.count({
        where: { userId: user.id, cdpWalletId: { not: null } },
      });
      if (existingCount >= maxPerUser) {
        return NextResponse.json(
          {
            error:
              'Достигнут лимит кошельков, созданных через CDP для этого пользователя. Подключите существующий кошелёк.',
          },
          { status: 429 },
        );
      }
    }

    const { createAgentWallet } = await import('@/lib/cdp/wallet');
    let result: { address: string; walletId?: string };
    try {
      result = await createAgentWallet();
    } catch (createErr) {
      console.error('createAgentWallet failed', createErr);
      const anyErr = createErr as { code?: string } | Error | null;
      if (anyErr && (anyErr as { code?: string }).code === 'CDP_RATE_LIMIT') {
        const message =
          'Лимит создания кошельков в CDP превышен. Подождите несколько минут или подключите существующий кошелёк.';
        return NextResponse.json({ error: message }, { status: 429 });
      }
      const message =
        process.env.CDP_API_KEY_NAME && process.env.CDP_API_KEY_PRIVATE_KEY
          ? 'Не удалось создать кошелёк через CDP. Проверьте ключи и сеть.'
          : 'CDP не настроен. Добавьте CDP_API_KEY_NAME и CDP_API_KEY_PRIVATE_KEY в .env.local';
      return NextResponse.json({ error: message }, { status: 503 });
    }

    const wallet = await prisma.wallet.create({
      data: {
        userId: user.id,
        address: result.address,
        agentId: agentId ?? undefined,
        networkId,
        cdpWalletId: result.walletId,
      },
    });
    if (agentId) {
      await prisma.agent.updateMany({
        where: { id: agentId, userId: user.id },
        data: { walletId: wallet.id, walletAddress: wallet.address },
      });
    }
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
      return NextResponse.json({ error: err.flatten() }, { status: 400 });
    }
    console.error('POST /api/wallets/create', err);
    const message = err instanceof Error ? err.message : 'Не удалось создать кошелёк';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
