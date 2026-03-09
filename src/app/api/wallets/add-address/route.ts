import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { safeDbConnect } from '@/lib/db/mongoose';
import Wallet from '@/lib/db/models/Wallet';
import User from '@/lib/db/models/User';
import { createFileWallet, setFileWalletAgentId } from '@/lib/db/file-wallets';
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

    const db = await safeDbConnect();
    if (db) {
      try {
        const user = await User.findOne({ email });
        if (user) {
          const existing = await Wallet.findOne({
            address: normalizedAddress,
            userId: user._id,
          });
          if (existing) {
            if (agentId) {
              await Wallet.findByIdAndUpdate(existing._id, { agentId });
              const Agent = (await import('@/lib/db/models/Agent')).default;
              await Agent.findByIdAndUpdate(agentId, { walletId: existing._id });
            }
            return NextResponse.json(existing);
          }
          const wallet = await Wallet.create({
            userId: user._id,
            agentId: agentId || undefined,
            address: normalizedAddress,
            networkId: process.env.NETWORK_ID ?? 'base-sepolia',
            cdpWalletId: null,
            isDefault: false,
          });
          if (agentId) {
            const Agent = (await import('@/lib/db/models/Agent')).default;
            await Agent.findByIdAndUpdate(agentId, { walletId: wallet._id });
          }
          return NextResponse.json(wallet);
        }
      } catch {
        // fallback to file
      }
    }

    const { getFileWalletByAddress } = await import('@/lib/db/file-wallets');
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
