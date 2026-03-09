import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { safeDbConnect } from '@/lib/db/mongoose';
import Agent from '@/lib/db/models/Agent';
import Wallet from '@/lib/db/models/Wallet';
import User from '@/lib/db/models/User';
import { getFileAgentById, updateFileAgentWallet } from '@/lib/db/file-agents';
import { getFileWalletById, setFileWalletAgentId } from '@/lib/db/file-wallets';
import { z } from 'zod';

const bodySchema = z.object({
  walletId: z.string().min(1),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const email = session.user.email;
    const { id: agentId } = await params;
    const body = await req.json();
    const { walletId } = bodySchema.parse(body);

    const db = await safeDbConnect();
    if (db) {
      try {
        const user = await User.findOne({ email });
        if (user) {
          const agent = await Agent.findOne({ _id: agentId, userId: user._id });
          if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
          const wallet = await Wallet.findOne({ _id: walletId, userId: user._id });
          if (!wallet) return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });

          const previousWalletId = agent.walletId?.toString();
          if (previousWalletId && previousWalletId !== walletId) {
            await Wallet.findByIdAndUpdate(previousWalletId, { agentId: null });
          }
          agent.walletId = wallet._id;
          await agent.save();
          await Wallet.findByIdAndUpdate(walletId, { agentId: agent._id });
          const updated = await Agent.findById(agentId).populate('walletId').lean();
          return NextResponse.json(updated);
        }
      } catch {
        // fallback to file
      }
    }

    const fileAgent = await getFileAgentById(agentId, email);
    if (!fileAgent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    const fileWallet = await getFileWalletById(walletId, email);
    if (!fileWallet) return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });

    if (fileWallet.agentId && fileWallet.agentId !== agentId) {
      await setFileWalletAgentId(fileWallet._id, email, null);
    }
    await setFileWalletAgentId(fileWallet._id, email, agentId);
    const updated = await updateFileAgentWallet(agentId, email, fileWallet._id, fileWallet.address);
    return NextResponse.json(updated ?? fileAgent);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.flatten() }, { status: 400 });
    }
    console.error('PUT /api/agents/[id]/wallet', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const email = session.user.email;
    const { id: agentId } = await params;

    const db = await safeDbConnect();
    if (db) {
      try {
        const user = await User.findOne({ email });
        if (user) {
          const agent = await Agent.findOne({ _id: agentId, userId: user._id });
          if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
          const walletId = agent.walletId?.toString();
          if (walletId) {
            await Wallet.findByIdAndUpdate(walletId, { agentId: null });
            agent.walletId = undefined;
            await agent.save();
          }
          const updated = await Agent.findById(agentId).populate('walletId').lean();
          return NextResponse.json(updated);
        }
      } catch {
        // fallback to file
      }
    }

    const fileAgent = await getFileAgentById(agentId, email);
    if (!fileAgent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    if (fileAgent.walletId) {
      await setFileWalletAgentId(fileAgent.walletId, email, null);
    }
    const updated = await updateFileAgentWallet(agentId, email, null, null);
    return NextResponse.json(updated ?? fileAgent);
  } catch (err) {
    console.error('DELETE /api/agents/[id]/wallet', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
