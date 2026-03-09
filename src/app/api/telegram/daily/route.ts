import { NextRequest, NextResponse } from 'next/server';
import { getFileAgentsByEmail } from '@/lib/db/file-agents';
import { getFilePoliciesByEmail } from '@/lib/db/file-policies';
import { getDemoSpentToday } from '@/lib/db/file-demo-transactions';

/**
 * Текст сообщения «оставшийся дневной лимит» по агентам.
 * GET /api/telegram/daily?secret=CRON_SECRET
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const param = req.nextUrl.searchParams.get('secret');
  if (!secret || param !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userEmail = process.env.TELEGRAM_USER_EMAIL?.trim();
  if (!userEmail) {
    return NextResponse.json({ text: 'Задайте TELEGRAM_USER_EMAIL в .env.local' });
  }
  const agents = await getFileAgentsByEmail(userEmail);
  if (agents.length === 0) {
    return NextResponse.json({
      text: '📅 Оставшийся дневной лимит\n\nНет агентов. Создайте агента на сайте и настройте политику.',
    });
  }
  const lines = ['📅 Оставшийся дневной лимит', ''];
  for (const agent of agents) {
    const [policies] = await getFilePoliciesByEmail(userEmail, agent._id);
    const dailyLimit = policies?.dailyLimit ?? -1;
    const spentToday = await getDemoSpentToday(agent._id, userEmail);
    if (dailyLimit < 0) {
      lines.push(`• ${agent.name}: без лимита (потрачено сегодня: ${spentToday.toFixed(2)} USDT)`);
    } else {
      const remaining = Math.max(0, dailyLimit - spentToday);
      lines.push(`• ${agent.name}: ${remaining.toFixed(2)} USDT из ${dailyLimit} (потрачено сегодня: ${spentToday.toFixed(2)} USDT)`);
    }
  }
  return NextResponse.json({ text: lines.join('\n').slice(0, 4096) });
}
