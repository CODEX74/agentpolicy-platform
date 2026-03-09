import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import dbConnect from '@/lib/db/mongoose';
import Wallet from '@/lib/db/models/Wallet';
import User from '@/lib/db/models/User';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await dbConnect();
    const user = await User.findOne({ email: session.user.email });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const address = req.nextUrl.searchParams.get('address');
    if (!address) {
      return NextResponse.json({ error: 'address is required' }, { status: 400 });
    }

    const wallet = await Wallet.findOne({ address: address.toLowerCase(), userId: user._id });
    if (!wallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    }

    const { getWalletBalance } = await import('@/lib/cdp/wallet');
    const balance = await getWalletBalance(wallet.address);
    return NextResponse.json({ address: wallet.address, balance });
  } catch (err) {
    console.error('GET /api/wallets/balance', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
