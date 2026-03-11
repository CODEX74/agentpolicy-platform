import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const address = req.nextUrl.searchParams.get('address');
    if (!address) {
      return NextResponse.json({ error: 'address is required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    const wallet = await prisma.wallet.findUnique({
      where: { userId_address: { userId: user.id, address: address.toLowerCase() } },
    });
    if (!wallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    }

    const { getWalletBalance } = await import('@/lib/cdp/wallet');
    const balance = await getWalletBalance(wallet.address, wallet.networkId);
    return NextResponse.json({ address: wallet.address, balance });
  } catch (err) {
    console.error('GET /api/wallets/balance', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
