import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db/prisma';
import { getDemoTransactionsByEmail, getDemoPositions } from '@/lib/db/demo-transactions';
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

    // Распределение активов по агентам (оценка позиций по рынку)
    const assetAllocationByAgent: {
      agentId: string;
      name: string;
      assets: { asset: string; valueUsd: number }[];
    }[] = [];
    for (const a of agents) {
      const positions = await getDemoPositions(a.id, email);
      const totals = new Map<string, number>();
      for (const p of positions) {
        const price = marketPrices[p.asset] ?? p.avgPriceUsd ?? 0;
        if (!price || p.quantity <= 0) continue;
        const value = p.quantity * price;
        totals.set(p.asset, (totals.get(p.asset) ?? 0) + value);
      }
      const assets = Array.from(totals.entries()).map(([asset, valueUsd]) => ({
        asset,
        valueUsd,
      }));
      assetAllocationByAgent.push({
        agentId: a.id,
        name: a.name,
        assets,
      });
    }

    // Покупки по агентам во времени
    const buysByAgentOverTime: {
      agentId: string;
      name: string;
      date: string;
      buyAmount: number;
    }[] = [];
    for (const t of demo) {
      if (!t.agentId || t.type !== 'buy_coin') continue;
      const agentId = t.agentId;
      const rec = agentBalances.find((ab) => ab.agentId === agentId);
      const name = rec?.name ?? 'Agent';
      const date = t.createdAt;
      buysByAgentOverTime.push({
        agentId,
        name,
        date,
        buyAmount: t.amountEth,
      });
    }

    // Сводные показатели для выводов
    const totalVolume = balanceHistory.reduce((sum, d) => sum + d.balance, 0);
    const totalDemoBalance = agentBalances.reduce(
      (sum, a) => sum + (a.demoBalance ?? 0),
      0
    );
    const bestPnlAgent =
      pnlByAgent.length > 0
        ? pnlByAgent.reduce((best, cur) =>
            cur.pnlTotal > best.pnlTotal ? cur : best
          )
        : null;
    const worstPnlAgent =
      pnlByAgent.length > 0
        ? pnlByAgent.reduce((worst, cur) =>
            cur.pnlTotal < worst.pnlTotal ? cur : worst
          )
        : null;

    const maxVolumeEntry =
      balanceHistory.length > 0
        ? balanceHistory.reduce((max, cur) =>
            cur.balance > max.balance ? cur : max
          )
        : null;

    const agentsWithPositiveBalance = agentBalances.filter(
      (a) => (a.demoBalance ?? 0) > 0
    ).length;

    const allAssetsFlat = assetAllocationByAgent.flatMap((a) => a.assets);
    const totalAssetsValue = allAssetsFlat.reduce(
      (sum, asset) => sum + asset.valueUsd,
      0
    );

    const lastBuyRecord =
      buysByAgentOverTime.length > 0
        ? buysByAgentOverTime.reduce((latest, cur) =>
            new Date(cur.date) > new Date(latest.date) ? cur : latest
          )
        : null;

    const totalBuysCount = buysByAgentOverTime.length;

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
                      children: [
                        new Paragraph({
                          children: [new TextRun({ text: 'Дата', bold: true })],
                        }),
                      ],
                    }),
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [new TextRun({ text: 'Объём, USDT', bold: true })],
                        }),
                      ],
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
              children: [
                new TextRun({
                  text: maxVolumeEntry
                    ? `За анализируемый период наибольший объём операций пришёлся на ${maxVolumeEntry.date} с объёмом ${maxVolumeEntry.balance.toLocaleString(
                        'ru-RU',
                        { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                      )} USDT. Общий объём за период составил ${totalVolume.toLocaleString(
                        'ru-RU',
                        { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                      )} USDT.`
                    : 'Данные по объёму операций за выбранный период отсутствуют.',
                }),
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
                      children: [
                        new Paragraph({
                          children: [new TextRun({ text: 'Агент', bold: true })],
                        }),
                      ],
                    }),
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [new TextRun({ text: 'Баланс, USDT', bold: true })],
                        }),
                      ],
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
              children: [
                new TextRun({
                  text:
                    agents.length > 0
                      ? `В системе ${agents.length} агентов, суммарный демо-баланс составляет ${totalDemoBalance.toLocaleString(
                          'ru-RU',
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          }
                        )} USDT; положительный баланс имеют ${agentsWithPositiveBalance} агентов.`
                      : 'У пользователя пока нет созданных агентов с демо-балансом.',
                }),
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
                      children: [
                        new Paragraph({
                          children: [new TextRun({ text: 'Агент', bold: true })],
                        }),
                      ],
                    }),
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [new TextRun({ text: 'P&L, USDT', bold: true })],
                        }),
                      ],
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
              children: [
                new TextRun({
                  text:
                    bestPnlAgent && pnlByAgent.length > 0
                      ? `По результатам демо-торговли лучший P&L показал агент «${bestPnlAgent.name}», общий результат составляет ${bestPnlAgent.pnlTotal.toLocaleString(
                          'ru-RU',
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          }
                        )} USDT.`
                      : 'Данные по P&L агентов на выбранном интервале отсутствуют.',
                }),
              ],
            }),
            worstPnlAgent && bestPnlAgent && worstPnlAgent.agentId !== bestPnlAgent.agentId
              ? new Paragraph({
                  children: [
                    new TextRun({
                      text: `Минимальный P&L у агента «${worstPnlAgent.name}» и составляет ${worstPnlAgent.pnlTotal.toLocaleString(
                        'ru-RU',
                        {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }
                      )} USDT.`,
                    }),
                  ],
                })
              : new Paragraph({ text: '' }),
            new Paragraph({
              text: '',
            }),
            new Paragraph({
              text: '4. Распределение активов по агентам (оценка позиций)',
              heading: HeadingLevel.HEADING_1,
            }),
            ...assetAllocationByAgent.map((agent) => {
              return new Paragraph({
                children: [
                  new TextRun({
                    text: `Агент: ${agent.name}`,
                    bold: true,
                  }),
                ],
              });
            }),
            ...assetAllocationByAgent.flatMap((agent) => {
              if (agent.assets.length === 0) {
                return [
                  new Paragraph({
                    text: `У агента ${agent.name} нет открытых позиций.`,
                  }),
                ];
              }
              return [
                new Table({
                  rows: [
                    new TableRow({
                      children: [
                        new TableCell({
                          children: [
                            new Paragraph({
                              children: [new TextRun({ text: 'Актив', bold: true })],
                            }),
                          ],
                        }),
                        new TableCell({
                          children: [
                            new Paragraph({
                              children: [
                                new TextRun({ text: 'Оценка позиции, USDT', bold: true }),
                              ],
                            }),
                          ],
                        }),
                      ],
                    }),
                    ...agent.assets.map(
                      (asset) =>
                        new TableRow({
                          children: [
                            new TableCell({
                              children: [new Paragraph(asset.asset)],
                            }),
                            new TableCell({
                              children: [
                                new Paragraph(
                                  asset.valueUsd.toLocaleString('ru-RU', {
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
                new Paragraph({ text: '' }),
              ];
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text:
                    allAssetsFlat.length > 0
                      ? `Совокупная оценка всех открытых позиций агентов составляет ${totalAssetsValue.toLocaleString(
                          'ru-RU',
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          }
                        )} USDT. Распределение по активам позволяет оценить концентрацию рисков и диверсификацию портфеля.`
                      : 'На момент формирования отчёта у агентов нет открытых демо-позиций.',
                }),
              ],
            }),

            new Paragraph({
              text: '',
            }),
            new Paragraph({
              text: '5. Решения и транзакции агентов (демо)',
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
                      children: [
                        new Paragraph({
                          children: [new TextRun({ text: 'Дата/время', bold: true })],
                        }),
                      ],
                    }),
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [new TextRun({ text: 'Агент', bold: true })],
                        }),
                      ],
                    }),
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [new TextRun({ text: 'Тип', bold: true })],
                        }),
                      ],
                    }),
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [new TextRun({ text: 'Сумма, USDT', bold: true })],
                        }),
                      ],
                    }),
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [new TextRun({ text: 'Актив', bold: true })],
                        }),
                      ],
                    }),
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [new TextRun({ text: 'Причина / планы', bold: true })],
                        }),
                      ],
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
              text: '6. Текущие рыночные цены (USD)',
              heading: HeadingLevel.HEADING_1,
            }),
            new Table({
              rows: [
                new TableRow({
                  children: [
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [new TextRun({ text: 'Актив', bold: true })],
                        }),
                      ],
                    }),
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [new TextRun({ text: 'Цена, USD', bold: true })],
                        }),
                      ],
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

            new Paragraph({
              text: '',
            }),
            new Paragraph({
              text: '7. Покупки по агентам во времени (демо)',
              heading: HeadingLevel.HEADING_1,
            }),
            new Table({
              rows: [
                new TableRow({
                  children: [
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [new TextRun({ text: 'Дата/время', bold: true })],
                        }),
                      ],
                    }),
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [new TextRun({ text: 'Агент', bold: true })],
                        }),
                      ],
                    }),
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [new TextRun({ text: 'Сумма покупки, USDT', bold: true })],
                        }),
                      ],
                    }),
                  ],
                }),
                ...buysByAgentOverTime.map(
                  (b) =>
                    new TableRow({
                      children: [
                        new TableCell({
                          children: [
                            new Paragraph(
                              new Date(b.date).toLocaleString('ru-RU', {
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
                          children: [new Paragraph(b.name)],
                        }),
                        new TableCell({
                          children: [
                            new Paragraph(
                              b.buyAmount.toLocaleString('ru-RU', {
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
              children: [
                new TextRun({
                  text:
                    totalBuysCount > 0 && lastBuyRecord
                      ? `За анализируемый период было зафиксировано ${totalBuysCount} демо-покупок по агентам; последняя покупка произошла ${new Date(
                          lastBuyRecord.date
                        ).toLocaleString('ru-RU', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}.`
                      : 'В рассматриваемый период демо-покупок по агентам не зафиксировано.',
                }),
              ],
            }),

            new Paragraph({
              text: '',
            }),
            new Paragraph({
              text: '8. Общий вывод по всей аналитике',
              heading: HeadingLevel.HEADING_1,
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `Суммарный объём демо-операций за последние ${DAYS_BACK} дней составил ${totalVolume.toLocaleString(
                    'ru-RU',
                    { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                  )} USDT.`,
                }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `Совокупный демо-баланс всех агентов: ${totalDemoBalance.toLocaleString(
                    'ru-RU',
                    { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                  )} USDT.`,
                }),
              ],
            }),
            bestPnlAgent
              ? new Paragraph({
                  children: [
                    new TextRun({
                      text: `Наилучший результат по P&L показал агент «${bestPnlAgent.name}» с результатом ${bestPnlAgent.pnlTotal.toLocaleString(
                        'ru-RU',
                        { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                      )} USDT.`,
                    }),
                  ],
                })
              : new Paragraph({ text: 'Данные по P&L агентов отсутствуют.' }),
            worstPnlAgent && bestPnlAgent && worstPnlAgent.agentId !== bestPnlAgent.agentId
              ? new Paragraph({
                  children: [
                    new TextRun({
                      text: `Наиболее слабый результат по P&L у агента «${worstPnlAgent.name}» с результатом ${worstPnlAgent.pnlTotal.toLocaleString(
                        'ru-RU',
                        { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                      )} USDT.`,
                    }),
                  ],
                })
              : new Paragraph({ text: '' }),
            new Paragraph({
              children: [
                new TextRun({
                  text: 'Демо-аналитика предназначена для оценки поведения агентов и не отражает реальные денежные потоки. Для перехода к боевому режиму необходимо настроить реальные кошельки и инфраструктуру CDP.',
                }),
              ],
            }),
          ],
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);

    return new NextResponse(new Uint8Array(buffer), {
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

