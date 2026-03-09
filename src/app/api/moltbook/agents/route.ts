import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { moltbookClient } from '@/lib/moltbook/client';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = req.nextUrl.searchParams.get('token') ?? (session as { accessToken?: string }).accessToken;
    if (!token) {
      return NextResponse.json(
        { error: 'Moltbook token or session access token required' },
        { status: 400 }
      );
    }

    const data = await moltbookClient.getUserAgents(token);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching Moltbook agents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agents from Moltbook' },
      { status: 500 }
    );
  }
}
