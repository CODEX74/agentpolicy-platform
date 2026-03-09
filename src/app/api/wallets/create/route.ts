import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { createFileWallet, setFileWalletAgentId } from '@/lib/db/file-wallets';
import { updateFileAgentWallet } from '@/lib/db/file-agents';
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

    const fileWallet = await createFileWallet({
      userEmail: email,
      address: result.address,
      agentId: agentId ?? null,
      networkId,
      cdpWalletId: result.walletId,
    });
    if (agentId) {
      await setFileWalletAgentId(fileWallet._id, email, agentId);
      await updateFileAgentWallet(agentId, email, fileWallet._id, fileWallet.address);
    }
    return NextResponse.json(fileWallet);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.flatten() }, { status: 400 });
    }
    console.error('POST /api/wallets/create', err);
    const message = err instanceof Error ? err.message : 'Не удалось создать кошелёк';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
