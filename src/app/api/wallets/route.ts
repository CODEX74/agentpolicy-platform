import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { safeDbConnect } from '@/lib/db/mongoose';
import Wallet from '@/lib/db/models/Wallet';
import User from '@/lib/db/models/User';
import { getFileWalletsByEmail } from '@/lib/db/file-wallets';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const email = session.user.email;

    const db = await safeDbConnect();
    if (db) {
      try {
        const user = await User.findOne({ email });
        if (user) {
          const wallets = await Wallet.find({ userId: user._id }).lean();
          return NextResponse.json(wallets);
        }
      } catch {
        // fallback to file
      }
    }

    try {
      const fileWallets = await getFileWalletsByEmail(email);
      return NextResponse.json(fileWallets);
    } catch (fileErr) {
      console.error('GET /api/wallets file fallback', fileErr);
      return NextResponse.json([]);
    }
  } catch (err) {
    console.error('GET /api/wallets', err);
    return NextResponse.json({ error: 'Не удалось загрузить список кошельков' }, { status: 500 });
  }
}
