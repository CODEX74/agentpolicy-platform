import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { getFileWalletsByEmail } from '@/lib/db/file-wallets';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const email = session.user.email;

    const fileWallets = await getFileWalletsByEmail(email);
    return NextResponse.json(fileWallets);
  } catch (err) {
    console.error('GET /api/wallets', err);
    return NextResponse.json({ error: 'Не удалось загрузить список кошельков' }, { status: 500 });
  }
}
