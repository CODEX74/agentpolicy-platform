import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';

const ethAddressRe = /^0x[a-fA-F0-9]{40}$/;

const bodySchema = z.object({
  address: z.string().min(1).refine((a) => ethAddressRe.test(a.trim()), 'Некорректный адрес (0x + 40 hex)'),
  agentId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const email = session.user.email;
    const body = await req.json();
    const { address, agentId } = bodySchema.parse(body);
    const normalizedAddress = address.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const existing = await prisma.wallet.findUnique({
      where: { userId_address: { userId: user.id, address: normalizedAddress } },
    });
    if (existing) {
      if (agentId) {
        await prisma.wallet.update({
          where: { id: existing.id },
          data: { agentId },
        });
        await prisma.agent.updateMany({
          where: { id: agentId, userId: user.id },
          data: { walletId: existing.id, walletAddress: existing.address },
        });
      }
      return NextResponse.json({
        _id: existing.id,
        userEmail: email,
        agentId: existing.agentId,
        address: existing.address,
        networkId: existing.networkId,
        cdpWalletId: existing.cdpWalletId,
        isDefault: existing.isDefault,
        createdAt: existing.createdAt.toISOString(),
        updatedAt: existing.updatedAt.toISOString(),
      });
    }

    const wallet = await prisma.wallet.create({
      data: {
        userId: user.id,
        address: normalizedAddress,
        agentId: agentId ?? undefined,
        networkId: process.env.NETWORK_ID ?? 'base-sepolia',
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
      const msg = err.errors.map((e) => e.message).join('; ');
      return NextResponse.json({ error: msg || 'Неверные данные' }, { status: 400 });
    }
    console.error('POST /api/wallets/add-address', err);
    return NextResponse.json({ error: 'Не удалось добавить кошелёк' }, { status: 500 });
  }
}
