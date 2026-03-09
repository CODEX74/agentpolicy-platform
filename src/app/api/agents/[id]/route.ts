import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import dbConnect from '@/lib/db/mongoose';
import Agent from '@/lib/db/models/Agent';
import { z } from 'zod';

const updateAgentSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  isActive: z.boolean().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await dbConnect();
    const User = (await import('@/lib/db/models/User')).default;
    const user = await User.findOne({ email: session.user.email });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const { id } = await params;
    const agent = await Agent.findOne({ _id: id, userId: user._id }).populate('walletId');
    if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    return NextResponse.json(agent);
  } catch (err) {
    console.error('GET /api/agents/[id]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await dbConnect();
    const User = (await import('@/lib/db/models/User')).default;
    const user = await User.findOne({ email: session.user.email });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const { id } = await params;
    const agent = await Agent.findOne({ _id: id, userId: user._id });
    if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });

    const body = await req.json();
    const data = updateAgentSchema.parse(body);
    Object.assign(agent, data);
    await agent.save();
    return NextResponse.json(agent);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.flatten() }, { status: 400 });
    }
    console.error('PATCH /api/agents/[id]', err);
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
    await dbConnect();
    const User = (await import('@/lib/db/models/User')).default;
    const user = await User.findOne({ email: session.user.email });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const { id } = await params;
    const agent = await Agent.findOneAndDelete({ _id: id, userId: user._id });
    if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/agents/[id]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
