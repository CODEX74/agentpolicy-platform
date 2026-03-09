import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { logger } from '@/lib/utils/logger';

export async function POST(req: NextRequest) {
  try {
    const headersList = await headers();
    const signature = headersList.get('x-cdp-signature');
    const rawBody = await req.text();

    if (!rawBody) {
      return NextResponse.json({ error: 'No body' }, { status: 400 });
    }

    logger.info('CDP webhook received', { hasSignature: !!signature, bodyLength: rawBody.length });

    const payload = JSON.parse(rawBody) as { type?: string; data?: unknown };
    const eventType = payload.type ?? 'unknown';

    switch (eventType) {
      case 'wallet.created':
      case 'transaction.completed':
      case 'transaction.failed':
        logger.info('CDP event', eventType, payload.data);
        break;
      default:
        logger.info('CDP webhook event', eventType);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error('CDP webhook error', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
