import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const email = session.user.email;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const rows = await prisma.wallet.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
    });
    const wallets = rows.map((w) => ({
      _id: w.id,
      userEmail: email,
      agentId: w.agentId,
      address: w.address,
      networkId: w.networkId,
      cdpWalletId: w.cdpWalletId,
      isDefault: w.isDefault,
      createdAt: w.createdAt.toISOString(),
      updatedAt: w.updatedAt.toISOString(),
    }));
    return NextResponse.json(wallets);
  } catch (err) {
    console.error('GET /api/wallets', err);
    return NextResponse.json({ error: 'Не удалось загрузить список кошельков' }, { status: 500 });
  }
}
