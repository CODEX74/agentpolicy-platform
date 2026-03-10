import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db/prisma';
import { getDemoTransactionsByEmail } from '@/lib/db/demo-transactions';
import { getMarketPrices } from '@/lib/ai/agent-trader';
import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
} from 'docx';

const DAYS_BACK = 14;

function aggregateByDay(
  transactions: { type: string; amountEth: number; createdAt: string }[]
): Record<string, number> {
  const byDay: Record<string, number> = {};
  for (const t of transactions) {
    if (t.type === 'hold') continue;
    const date = t.createdAt.slice(0, 10);
    byDay[date] = (byDay[date] ?? 0) + t.amountEth;
  }
  return byDay;
}

function lastNDays(n: number): string[] {
  const out: string[] = [];
  const d = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const x = new Date(d);
    x.setDate(x.getDate() - i);
    out.push(x.toISOString().slice(0, 10));
  }
  return out;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const email = session.user.email;

    const [demo, user, marketPrices] = await Promise.all([
      getDemoTransactionsByEmail(email),
      prisma.user.findUnique({
        where: { email },
        include: { agents: true },
      }),
      getMarketPrices(),
    ]);

    const byDay = aggregateByDay(demo);
    const dates = lastNDays(DAYS_BACK);
    const balanceHistory = dates.map((date) => ({
      date,
      balance: byDay[date] ?? 0,
    }));

    const agents = user?.agents ?? [];

    const agentBalances = agents.map((a) => ({
      agentId: a.id,
      name: a.name,
      demoBalance: a.demoBalance ?? 0,
    }));

    const pnlByAgentMap = new Map<
      string,
      { agentId: string; name: string; totalBuys: number; totalSells: number }
    >();
    for (const a of agents) {
      pnlByAgentMap.set(a.id, {
        agentId: a.id,
        name: a.name,
        totalBuys: 0,
        totalSells: 0,
      });
    }
    for (const t of demo) {
      if (!t.agentId) continue;
      if (t.type !== 'buy_coin' && t.type !== 'sell_coin') continue;
      const rec = pnlByAgentMap.get(t.agentId);
      if (!rec) continue;
      if (t.type === 'buy_coin') rec.totalBuys += t.amountEth;
      if (t.type === 'sell_coin') rec.totalSells += t.amountEth;
    }
    const pnlByAgent = Array.from(pnlByAgentMap.values()).map((p) => ({
      agentId: p.agentId,
      name: p.name,
      pnlTotal: p.totalSells - p.totalBuys,
    }));

    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              text: 'Отчёт по аналитике агентов',
              heading: HeadingLevel.TITLE,
            }),
            new Paragraph({
              text: `Сформирован: ${new Date().toLocaleString('ru-RU')}`,
            }),
            new Paragraph({
              text: '',
            }),

            new Paragraph({
              text: '1. Объём операций по дням (USDT)',
              heading: HeadingLevel.HEADING_1,
            }),
            new Table({
              rows: [
                new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph({ text: 'Дата', bold: true })],
                    }),
                    new TableCell({
                      children: [new Paragraph({ text: 'Объём, USDT', bold: true })],
                    }),
                  ],
                }),
                ...balanceHistory.map(
                  (item) =>
                    new TableRow({
                      children: [
                        new TableCell({
                          children: [new Paragraph(item.date)],
                        }),
                        new TableCell({
                          children: [
                            new Paragraph(
                              item.balance.toLocaleString('ru-RU', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })
                            ),
                          ],
                        }),
                      ],
                    })
                ),
              ],
            }),

            new Paragraph({
              text: '',
            }),
            new Paragraph({
              text: '2. Балансы агентов (демо)',
              heading: HeadingLevel.HEADING_1,
            }),
            new Table({
              rows: [
                new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph({ text: 'Агент', bold: true })],
                    }),
                    new TableCell({
                      children: [new Paragraph({ text: 'Баланс, USDT', bold: true })],
                    }),
                  ],
                }),
                ...agentBalances.map(
                  (item) =>
                    new TableRow({
                      children: [
                        new TableCell({
                          children: [new Paragraph(item.name)],
                        }),
                        new TableCell({
                          children: [
                            new Paragraph(
                              (item.demoBalance ?? 0).toLocaleString('ru-RU', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })
                            ),
                          ],
                        }),
                      ],
                    })
                ),
              ],
            }),

            new Paragraph({
              text: '',
            }),
            new Paragraph({
              text: '3. P&L по агентам (все время, демо)',
              heading: HeadingLevel.HEADING_1,
            }),
            new Table({
              rows: [
                new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph({ text: 'Агент', bold: true })],
                    }),
                    new TableCell({
                      children: [new Paragraph({ text: 'P&L, USDT', bold: true })],
                    }),
                  ],
                }),
                ...pnlByAgent.map(
                  (item) =>
                    new TableRow({
                      children: [
                        new TableCell({
                          children: [new Paragraph(item.name)],
                        }),
                        new TableCell({
                          children: [
                            new Paragraph(
                              item.pnlTotal.toLocaleString('ru-RU', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })
                            ),
                          ],
                        }),
                      ],
                    })
                ),
              ],
            }),

            new Paragraph({
              text: '',
            }),
            new Paragraph({
              text: '4. Решения и транзакции агентов (демо)',
              heading: HeadingLevel.HEADING_1,
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: 'Сводка по всем демо-транзакциям, включая причины решений и планы.',
                }),
              ],
            }),
            new Paragraph({
              text: '',
            }),
            new Table({
              rows: [
                new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph({ text: 'Дата/время', bold: true })],
                    }),
                    new TableCell({
                      children: [new Paragraph({ text: 'Агент', bold: true })],
                    }),
                    new TableCell({
                      children: [new Paragraph({ text: 'Тип', bold: true })],
                    }),
                    new TableCell({
                      children: [new Paragraph({ text: 'Сумма, USDT', bold: true })],
                    }),
                    new TableCell({
                      children: [new Paragraph({ text: 'Актив', bold: true })],
                    }),
                    new TableCell({
                      children: [new Paragraph({ text: 'Причина / планы', bold: true })],
                    }),
                  ],
                }),
                ...demo.map((t) => {
                  const agentName =
                    agents.find((a) => a.id === t.agentId)?.name ?? t.agentId ?? '';
                  const meta: string[] = [];
                  if (t.reason) meta.push(`Причина: ${t.reason}`);
                  if (t.priceReason) meta.push(`Цена: ${t.priceReason}`);
                  if (t.plans) meta.push(`Планы: ${t.plans}`);
                  if (t.termDays != null) meta.push(`Горизонт (дни): ${t.termDays}`);
                  if (t.termMinutes != null) meta.push(`Горизонт (минуты): ${t.termMinutes}`);

                  return new TableRow({
                    children: [
                      new TableCell({
                        children: [
                          new Paragraph(
                            new Date(t.createdAt).toLocaleString('ru-RU', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          ),
                        ],
                      }),
                      new TableCell({
                        children: [new Paragraph(agentName)],
                      }),
                      new TableCell({
                        children: [new Paragraph(t.type)],
                      }),
                      new TableCell({
                        children: [
                          new Paragraph(
                            t.amountEth.toLocaleString('ru-RU', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })
                          ),
                        ],
                      }),
                      new TableCell({
                        children: [new Paragraph(t.asset ?? '')],
                      }),
                      new TableCell({
                        children: [new Paragraph(meta.join('\n'))],
                      }),
                    ],
                  });
                }),
              ],
            }),

            new Paragraph({
              text: '',
            }),
            new Paragraph({
              text: '5. Текущие рыночные цены (USD)',
              heading: HeadingLevel.HEADING_1,
            }),
            new Table({
              rows: [
                new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph({ text: 'Актив', bold: true })],
                    }),
                    new TableCell({
                      children: [new Paragraph({ text: 'Цена, USD', bold: true })],
                    }),
                  ],
                }),
                ...Object.entries(marketPrices).map(
                  ([asset, price]) =>
                    new TableRow({
                      children: [
                        new TableCell({
                          children: [new Paragraph(asset)],
                        }),
                        new TableCell({
                          children: [
                            new Paragraph(
                              Number(price ?? 0).toLocaleString('ru-RU', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })
                            ),
                          ],
                        }),
                      ],
                    })
                ),
              ],
            }),
          ],
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': 'attachment; filename="agent-analytics-report.docx"',
      },
    });
  } catch (err) {
    console.error('GET /api/analytics/report', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

