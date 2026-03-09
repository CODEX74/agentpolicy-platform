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

    const { createAgentWallet } = await import('@/lib/cdp/wallet');
    let result: { address: string; walletId?: string };
    try {
      result = await createAgentWallet();
    } catch (createErr) {
      console.error('createAgentWallet failed', createErr);
      const message =
        process.env.CDP_API_KEY_NAME && process.env.CDP_API_KEY_PRIVATE_KEY
          ? 'Не удалось создать кошелёк через CDP. Проверьте ключи и сеть.'
          : 'CDP не настроен. Добавьте CDP_API_KEY_NAME и CDP_API_KEY_PRIVATE_KEY в .env.local';
      return NextResponse.json({ error: message }, { status: 503 });
    }
    const networkId = process.env.NETWORK_ID ?? 'base-sepolia';
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

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
