import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { createFileWallet, getFileWalletByAddress, setFileWalletAgentId } from '@/lib/db/file-wallets';
import { updateFileAgentWallet } from '@/lib/db/file-agents';
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

    const existingFile = await getFileWalletByAddress(normalizedAddress, email);
    if (existingFile) {
      if (agentId) {
        await setFileWalletAgentId(existingFile._id, email, agentId);
        await updateFileAgentWallet(agentId, email, existingFile._id, existingFile.address);
      }
      return NextResponse.json(existingFile);
    }

    const fileWallet = await createFileWallet({
      userEmail: email,
      address: normalizedAddress,
      agentId: agentId ?? null,
      networkId: process.env.NETWORK_ID ?? 'base-sepolia',
      cdpWalletId: null,
    });
    if (agentId) {
      await setFileWalletAgentId(fileWallet._id, email, agentId);
      await updateFileAgentWallet(agentId, email, fileWallet._id, fileWallet.address);
    }
    return NextResponse.json(fileWallet);
  } catch (err) {
    if (err instanceof z.ZodError) {
      const msg = err.errors.map((e) => e.message).join('; ');
      return NextResponse.json({ error: msg || 'Неверные данные' }, { status: 400 });
    }
    console.error('POST /api/wallets/add-address', err);
    return NextResponse.json({ error: 'Не удалось добавить кошелёк' }, { status: 500 });
  }
}
