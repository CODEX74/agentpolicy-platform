import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import {
  getDemoPositions,
  type DemoPosition,
} from "@/lib/db/demo-transactions";
import {
  runAgentOnce,
  type RunAgentResult,
  getMockMarketTrend,
} from "@/lib/agent-run";
import { sendTelegramMessageToChat } from "@/lib/telegram";
import { getTelegramIdByEmail } from "@/lib/db/user-telegram";
import { formatAssetQuantity } from "@/lib/utils/format";
import {
  getAgentTradeDecision,
  getMarketPrices,
  getUsdtPriceUsd,
} from "@/lib/ai/agent-trader";
import {
  createPublicClient,
  createWalletClient,
  http,
  type Address,
} from "viem";
import { base, baseSepolia, mainnet } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { decryptPrivateKey } from "@/lib/wallets/serverKey";

/** Принудительно Node.js runtime (viem/DEX не поддерживают Edge). */
export const runtime = "nodejs";

/**
 * Крон для агентов с run24_7: запускает один цикл принятия решения для каждого такого агента.
 * Вызывать по расписанию (например каждые 5–15 мин) через Vercel Cron или внешний сервис.
 *
 * Защита: заголовок Authorization: Bearer <CRON_SECRET> или ?secret=CRON_SECRET
 */
export async function GET(req: NextRequest) {
  return handleCron(req);
}

export async function POST(req: NextRequest) {
  return handleCron(req);
}

async function handleCron(req: NextRequest): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured. Set in .env.local for 24/7 cron." },
      { status: 503 },
    );
  }

  const authHeader = req.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const querySecret = req.nextUrl.searchParams.get("secret");
  const provided = bearer ?? querySecret ?? "";

  if (provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Сначала обрабатываем real-агентов, чтобы их запросы к ИИ шли первыми.
  const realAgents = await prisma.agent.findMany({
    where: { run24_7: true, agentMode: "WALLET", realTradingEnabled: true },
    include: { user: true },
  });

  const realResults: {
    agentId: string;
    agentName: string;
    userEmail: string;
    action: string;
    reason?: string;
    error?: string;
    asset?: string;
    amountEth?: number;
    amountUsd?: number;
    tokenAmount?: number;
  }[] = [];

  if (realAgents.length > 0) {
    const [marketPrices, usdtPrice] = await Promise.all([
      getMarketPrices(),
      getUsdtPriceUsd(),
    ]);
    const marketTrend = getMockMarketTrend();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const agent of realAgents) {
      const userEmail = agent.user.email;
      if (!userEmail || !agent.realWalletAddress) continue;

      const agg = await prisma.realTransaction.aggregate({
        where: {
          agentId: agent.id,
          userId: agent.user.id,
          createdAt: { gte: today },
        },
        _sum: { amountUsd: true },
      });
      const spentToday = agg._sum.amountUsd ?? 0;
      const dailyLimit = agent.realDailyLimitUsd ?? -1;
      const maxPerTx = agent.realMaxPositionUsd ?? -1;
      const minPerTx = agent.realMinPositionUsd ?? 0;

      // Цена ETH в USD: сначала берём из marketPrices, затем из usdtPrice, в крайнем случае 1.
      const ethPriceUsd = marketPrices.ETH ?? usdtPrice ?? 1;

      const input = {
        agentName: agent.name,
        agentType: agent.agentType as "INVESTOR" | "TRADER",
        demoBalanceEth: dailyLimit > 0 ? dailyLimit : 0,
        policy: {
          dailyLimit,
          weeklyLimit: -1,
          maxPerTransaction: maxPerTx,
          allowedOperations: ["buy", "sell"] as string[],
        },
        spentTodayEth: spentToday,
        spentWeekEth: spentToday,
        ethPriceUsd,
        marketPrices,
        marketTrend,
      };

      const decisionResult = await getAgentTradeDecision(input);
      const decision = decisionResult.decision;

      if (!decision) {
        realResults.push({
          agentId: agent.id,
          agentName: agent.name,
          userEmail,
          action: "hold",
          reason: decisionResult.error,
          error: decisionResult.error,
        });
        continue;
      }

      const rawAmount = decision.amountEth ?? 0;
      // Приводим сумму к лимитам: не больше maxPerTx и не больше доступного дневного лимита.
      const remainingDaily = dailyLimit > 0 ? dailyLimit - spentToday : -1;
      let amount = rawAmount;
      if (maxPerTx > 0) {
        amount = Math.min(amount, maxPerTx);
      }
      if (remainingDaily > 0) {
        amount = Math.min(amount, remainingDaily);
      }

      const allowedByDaily =
        dailyLimit < 0 || spentToday + amount <= dailyLimit;
      const allowedByMax = maxPerTx < 0 || amount <= maxPerTx;
      if (!allowedByDaily || !allowedByMax) {
        realResults.push({
          agentId: agent.id,
          agentName: agent.name,
          userEmail,
          action: "hold",
          reason: `Решение отклонено по лимитам real-wallet. ${decision.reason}`,
          asset: decision.asset,
        });
        continue;
      }
      if (minPerTx > 0 && amount < minPerTx) {
        // Поднимаем размер сделки до минимума, если позволяют лимиты.
        const maxAllowed =
          Math.min(
            maxPerTx > 0 ? maxPerTx : Infinity,
            remainingDaily > 0 ? remainingDaily : Infinity,
          ) || minPerTx;
        amount = Math.min(minPerTx, maxAllowed);
        if (amount < minPerTx || amount <= 0) {
          realResults.push({
            agentId: agent.id,
            agentName: agent.name,
            userEmail,
            action: "hold",
            reason: `Лимиты не позволяют открыть сделку даже на минимум ${minPerTx} USD. ${decision.reason}`,
            asset: decision.asset,
          });
          continue;
        }
      }

      // ——— sell_coin: только Ethereum mainnet, DEX TOKEN → USDT ———
      if (decision.action === "sell_coin" && decision.asset) {
        const walletForSell = await prisma.wallet.findFirst({
          where: {
            userId: agent.user.id,
            address: agent.realWalletAddress.toLowerCase(),
          },
        });
        if (!walletForSell) {
          realResults.push({
            agentId: agent.id,
            agentName: agent.name,
            userEmail,
            action: "error",
            reason: "Wallet record not found for sell",
            asset: decision.asset,
          });
          continue;
        }
        const networkIdSell =
          walletForSell.networkId ?? agent.realWalletNetwork ?? "base-sepolia";
        if (networkIdSell !== "ethereum-mainnet") {
          realResults.push({
            agentId: agent.id,
            agentName: agent.name,
            userEmail,
            action: "sell_coin",
            reason: "Продажа через DEX только в сети Ethereum mainnet.",
            asset: decision.asset,
          });
          continue;
        }
        const {
          getTokenAddressByTicker: getTokenAddrByTicker,
          getSwapCalldataTokenToUSDT: getSwapTokenToUsdt,
          getApproveCalldata: getApproveCalldataDex,
          getTokenBalance: getTokenBalanceDex,
          getTokenDecimals: getTokenDecimalsDex,
        } = await import("@/lib/dex/uniswap");
        const tokenAddr = getTokenAddrByTicker(decision.asset);
        if (!tokenAddr) {
          realResults.push({
            agentId: agent.id,
            agentName: agent.name,
            userEmail,
            action: "error",
            reason: `Токен ${decision.asset} не в whitelist DEX для продажи.`,
            asset: decision.asset,
          });
          continue;
        }
        if (agent.realWalletId) {
          realResults.push({
            agentId: agent.id,
            agentName: agent.name,
            userEmail,
            action: "sell_coin",
            reason:
              "Продажа через DEX только для кошелька с серверным ключом/CDP.",
            asset: decision.asset,
          });
          continue;
        }
        const rpcUrlEth =
          process.env.ETHEREUM_RPC_URL ??
          "https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID";
        const publicClientSell = createPublicClient({
          chain: mainnet,
          transport: http(rpcUrlEth),
        });
        const balance = await getTokenBalanceDex(
          publicClientSell,
          tokenAddr,
          agent.realWalletAddress as Address,
        );
        const decimals = getTokenDecimalsDex(tokenAddr);
        const tokenPriceUsd = marketPrices[decision.asset] ?? 0;
        const amountUsdWorth =
          tokenPriceUsd > 0
            ? (Number(balance) / 10 ** decimals) * tokenPriceUsd
            : 0;
        const limitEthEquiv = maxPerTx > 0 ? maxPerTx / (ethPriceUsd || 1) : -1;
        const remainingDailyEth =
          remainingDaily > 0 ? remainingDaily / (ethPriceUsd || 1) : -1;
        let sellAmountWei = balance;
        if (limitEthEquiv > 0 || remainingDailyEth > 0) {
          const maxUsd = Math.min(
            limitEthEquiv > 0 ? limitEthEquiv * ethPriceUsd : Infinity,
            remainingDailyEth > 0 ? remainingDailyEth * ethPriceUsd : Infinity,
          );
          if (amountUsdWorth > maxUsd && maxUsd > 0) {
            const fraction = maxUsd / amountUsdWorth;
            sellAmountWei =
              (balance * BigInt(Math.floor(fraction * 1e6))) / BigInt(1000000);
            if (sellAmountWei === BigInt(0)) sellAmountWei = balance;
          }
        }
        if (sellAmountWei === BigInt(0)) {
          realResults.push({
            agentId: agent.id,
            agentName: agent.name,
            userEmail,
            action: "sell_coin",
            reason: "Нулевой баланс токена для продажи.",
            asset: decision.asset,
          });
          continue;
        }
        const toAddressSell =
          agent.realTradeRecipient ||
          process.env.REAL_TRADE_RECIPIENT ||
          "0x0000000000000000000000000000000000000000";
        try {
          const swapResult = await getSwapTokenToUsdt({
            tokenIn: tokenAddr,
            amountInWei: sellAmountWei,
            recipient: toAddressSell as Address,
            publicClient: publicClientSell,
          });
          const privateKey = walletForSell?.serverPrivateKey
            ? decryptPrivateKey(walletForSell.serverPrivateKey)
            : null;
          if (!privateKey) {
            realResults.push({
              agentId: agent.id,
              agentName: agent.name,
              userEmail,
              action: "error",
              reason: "Для продажи нужен кошелёк с serverPrivateKey.",
              asset: decision.asset,
            });
            continue;
          }
          const account = privateKeyToAccount(privateKey);
          const walletClientSell = createWalletClient({
            account,
            chain: mainnet,
            transport: http(rpcUrlEth),
          });
          const approveCalldata = getApproveCalldataDex(tokenAddr, sellAmountWei);
          await walletClientSell.sendTransaction({
            to: approveCalldata.to,
            data: approveCalldata.data,
          });
          const txHashSell = await walletClientSell.sendTransaction({
            to: swapResult.to,
            data: swapResult.data,
            value: swapResult.value,
          });
          const sellAmountUsd =
            (Number(sellAmountWei) / 10 ** decimals) * tokenPriceUsd;
          await prisma.realTransaction.create({
            data: {
              agentId: agent.id,
              userId: agent.user.id,
              txHash: txHashSell,
              asset: decision.asset,
              amountUsd: sellAmountUsd,
              side: "sell",
              network: "ethereum-mainnet",
              walletAddress: agent.realWalletAddress,
            },
          });
          realResults.push({
            agentId: agent.id,
            agentName: agent.name,
            userEmail,
            action: "sell_coin",
            reason: decision.reason,
            asset: decision.asset,
            amountEth: sellAmountUsd / (ethPriceUsd || 1),
            amountUsd: sellAmountUsd,
            tokenAmount: Number(sellAmountWei) / 10 ** decimals,
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          realResults.push({
            agentId: agent.id,
            agentName: agent.name,
            userEmail,
            action: "error",
            reason: `Не удалось выполнить swap ${decision.asset} → USDT: ${msg}`,
            asset: decision.asset,
          });
        }
        continue;
      }

      if (decision.action !== "buy_coin" || amount <= 0) {
        realResults.push({
          agentId: agent.id,
          agentName: agent.name,
          userEmail,
          action: decision.action,
          reason: decision.reason,
          asset: decision.asset,
        });
        continue;
      }

      const isConnectedWallet = !agent.realWalletId;
      const networkId = agent.realWalletNetwork ?? "base-sepolia";
      const toAddressRecipient =
        agent.realTradeRecipient ||
        process.env.REAL_TRADE_RECIPIENT ||
        "0x0000000000000000000000000000000000000000";

      let valueWei = String(BigInt(Math.floor(amount * 1_000_000))); // по умолчанию USDC 6 decimals
      let toAddress = toAddressRecipient;
      let swapCalldataResult: { to: Address; data: `0x${string}`; value: bigint } | null = null;

      if (networkId === "ethereum-mainnet") {
        if (!decision.asset) {
          realResults.push({
            agentId: agent.id,
            agentName: agent.name,
            userEmail,
            action: "hold",
            reason: `Для торговли в Ethereum mainnet агент должен выбрать конкретный токен (кроме ETH). ${decision.reason}`,
            asset: decision.asset,
          });
          continue;
        }
        const {
          getTokenAddressByTicker: getTickerAddr,
          getSwapCalldataETHToToken: getSwapEthToToken,
        } = await import("@/lib/dex/uniswap");
        if (decision.asset === "ETH" || decision.asset === "WETH") {
          realResults.push({
            agentId: agent.id,
            agentName: agent.name,
            userEmail,
            action: "hold",
            reason: `Покупка ETH за ETH не выполняется. Агент будет ждать возможности купить альткоин (BTC, SOL, AVAX и т.п.). ${decision.reason}`,
            asset: decision.asset,
          });
          continue;
        }
        const tokenOut = getTickerAddr(decision.asset);
        if (!tokenOut) {
          realResults.push({
            agentId: agent.id,
            agentName: agent.name,
            userEmail,
            action: "hold",
            reason: `Токен ${decision.asset} не поддерживается для DEX-свапов на Ethereum mainnet. ${decision.reason}`,
            asset: decision.asset,
          });
          continue;
        }
        const amountEth = amount / (ethPriceUsd || 1);
        const valueWeiEth = BigInt(Math.floor(amountEth * 1e18));
        const rpcUrlEth =
          process.env.ETHEREUM_RPC_URL ??
          "https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID";
        const publicClientEth = createPublicClient({
          chain: mainnet,
          transport: http(rpcUrlEth),
        });
        swapCalldataResult = await getSwapEthToToken({
          amountInWei: valueWeiEth,
          tokenOut,
          recipient: toAddressRecipient as Address,
          publicClient: publicClientEth,
        });
        toAddress = swapCalldataResult.to;
        valueWei = String(swapCalldataResult.value);
      }

      if (isConnectedWallet) {
        // Подключённый кошелёк: создаём ожидающую транзакцию; пользователь подпишет в браузере.
        await prisma.pendingRealTransaction.create({
          data: {
            agentId: agent.id,
            userId: agent.user.id,
            fromAddress: agent.realWalletAddress,
            toAddress,
            valueWei,
            data: swapCalldataResult?.data ?? undefined,
            networkId,
            asset: decision.asset ?? "USDC",
            amountUsd: amount,
            reason: decision.reason ?? undefined,
            status: "pending",
          },
        });
        realResults.push({
          agentId: agent.id,
          agentName: agent.name,
          userEmail,
          action: "buy_coin_pending",
          reason: decision.reason,
          asset: decision.asset,
          amountUsd: amount,
        });
      } else {
        // Кошелёк создан/контролируется приложением (CDP или приватный ключ): отправляем реальную транзакцию.
        const wallet = await prisma.wallet.findFirst({
          where: {
            userId: agent.user.id,
            address: agent.realWalletAddress.toLowerCase(),
          },
        });

        if (!wallet) {
          realResults.push({
            agentId: agent.id,
            agentName: agent.name,
            userEmail,
            action: "error",
            reason: "Wallet record not found for real agent",
            asset: decision.asset,
            amountUsd: amount,
          });
          continue;
        }

        let txHash: string | undefined;
        const walletNetworkId =
          wallet.networkId || process.env.NETWORK_ID || "base-sepolia";

        try {
          if (wallet.cdpWalletId) {
            if (swapCalldataResult) {
              realResults.push({
                agentId: agent.id,
                agentName: agent.name,
                userEmail,
                action: "error",
                reason:
                  "DEX swap на Ethereum mainnet поддерживается только для кошелька с serverPrivateKey.",
                asset: decision.asset,
                amountUsd: amount,
              });
              continue;
            }
            const { sendTransaction } = await import("@/lib/cdp/transaction");
            const res = await sendTransaction({
              fromAddress: agent.realWalletAddress,
              toAddress,
              valueWei,
              networkId: walletNetworkId,
            });
            txHash = res.txHash;
          } else if (wallet.serverPrivateKey) {
            const privateKey = decryptPrivateKey(wallet.serverPrivateKey);
            const account = privateKeyToAccount(privateKey);

            const { rpcUrl, chain } =
              walletNetworkId === "base-mainnet"
                ? {
                    rpcUrl: "https://mainnet.base.org",
                    chain: base,
                  }
                : walletNetworkId === "base-sepolia"
                  ? {
                      rpcUrl: "https://sepolia.base.org",
                      chain: baseSepolia,
                    }
                  : walletNetworkId === "ethereum-mainnet"
                    ? {
                        rpcUrl:
                          process.env.ETHEREUM_RPC_URL ??
                          "https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID",
                        chain: mainnet,
                      }
                    : {
                        rpcUrl:
                          process.env.BASE_RPC_URL ??
                          "https://sepolia.base.org",
                        chain: baseSepolia,
                      };

            const client = createWalletClient({
              account,
              chain,
              transport: http(rpcUrl),
            });

            if (swapCalldataResult) {
              txHash = await client.sendTransaction({
                to: swapCalldataResult.to,
                data: swapCalldataResult.data,
                value: swapCalldataResult.value,
              });
            } else {
              txHash = await client.sendTransaction({
                to: toAddress as Address,
                value: BigInt(valueWei),
              });
            }
          } else {
            realResults.push({
              agentId: agent.id,
              agentName: agent.name,
              userEmail,
              action: "error",
              reason:
                "Wallet is not configured for server-side sending (no cdpWalletId or serverPrivateKey).",
              asset: decision.asset,
              amountUsd: amount,
            });
            continue;
          }

          await prisma.realTransaction.create({
            data: {
              agentId: agent.id,
              userId: agent.user.id,
              txHash: txHash ?? "unknown",
              asset: decision.asset ?? "USDC",
              amountUsd: amount,
              side: "buy",
              network: agent.realWalletNetwork ?? "base",
              walletAddress: agent.realWalletAddress,
            },
          });

          realResults.push({
            agentId: agent.id,
            agentName: agent.name,
            userEmail,
            action: "buy_coin",
            reason: decision.reason,
            asset: decision.asset,
            amountEth: amount,
            amountUsd: amount * ethPriceUsd,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          realResults.push({
            agentId: agent.id,
            agentName: agent.name,
            userEmail,
            action: "error",
            reason: `Failed to send real transaction: ${message}`,
            asset: decision.asset,
            amountUsd: amount,
          });
        }
      }
    }
  }

  // Затем обрабатываем демо-агентов (они менее критичны по приоритету запросов к ИИ).
  let agents;
  try {
    agents = await prisma.agent.findMany({
      where: { run24_7: true, demoBalance: { gt: 0 } },
      include: { user: true },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (
      msg.includes("WITHIN GROUP is required for ordered-set aggregate mode")
    ) {
      console.error(
        "[cron run-agents] prisma.agent.findMany failed, skipping run:",
        msg,
      );
      return NextResponse.json({
        ok: true,
        ran: 0,
        results: [],
        realResults,
        telegramByUser: {},
        hintEmpty:
          "Ошибка подключения к базе данных (WITHIN GROUP). Крон пропущен, проверьте версию Postgres.",
      });
    }
    throw e;
  }
  const results: {
    agentId: string;
    agentName: string;
    userEmail: string;
    result: RunAgentResult;
    positions: DemoPosition[];
  }[] = [];

  for (const agent of agents) {
    const userEmail = agent.user.email;
    if (!userEmail) continue;
    const result = await runAgentOnce(agent.id, userEmail);
    const positions = await getDemoPositions(agent.id, userEmail);
    results.push({
      agentId: agent.id,
      agentName: agent.name,
      userEmail,
      result,
      positions,
    });
  }

  const resultsForJson = results.map((r) => ({
    agentId: r.agentId,
    agentName: r.agentName,
    action: r.result.action,
    reason: r.result.reason,
    error: r.result.error,
    asset: r.result.asset,
    priceReason: r.result.priceReason,
    termDays: r.result.termDays,
    plans: r.result.plans,
    assetPriceUsd: r.result.assetPriceUsd,
  }));

  // Уведомления: отправляем каждому пользователю в его Telegram chat id (если привязан)
  const byUser = new Map<
    string,
    { demo: (typeof results)[number][]; real: typeof realResults }
  >();
  for (const r of results) {
    const key = r.userEmail.toLowerCase();
    const prev = byUser.get(key) ?? { demo: [], real: [] };
    byUser.set(key, { demo: [...prev.demo, r], real: prev.real });
  }
  for (const rr of realResults) {
    const key = rr.userEmail.toLowerCase();
    const prev = byUser.get(key) ?? { demo: [], real: [] };
    byUser.set(key, { demo: prev.demo, real: [...prev.real, rr] });
  }

  const telegramByUser: Record<string, { sent: boolean; error?: string }> = {};
  for (const [email, grouped] of byUser.entries()) {
    const chatId = await getTelegramIdByEmail(email);
    if (!chatId) continue;
    const hasDemo = grouped.demo.length > 0;
    const hasReal = grouped.real.length > 0;
    const lines =
      hasDemo || hasReal
        ? [
            `🤖 Агенты 24/7 (${new Date().toLocaleString("ru-RU")})`,
            "",
            ...grouped.demo.flatMap((r, idx) => {
              const a =
                r.result.action === "hold"
                  ? "⏸ Держать"
                  : r.result.action === "buy_coin" && r.result.asset
                    ? `▶ Покупка ${r.result.asset}`
                    : r.result.action === "sell_coin" && r.result.asset
                      ? `▶ Продажа ${r.result.asset}`
                      : `▶ ${r.result.action}`;
              const reason = r.result.reason ?? r.result.error ?? "—";
              const balanceStr =
                r.result.demoBalance != null
                  ? `${r.result.demoBalance} USDT`
                  : "—";
              const parts = [
                `• ${r.agentName}: ${a}`,
                `Демо-баланс: ${balanceStr}`,
              ];
              if (r.positions?.length) {
                parts.push(
                  "Позиции:",
                  ...r.positions.map((p) => {
                    const qty = formatAssetQuantity(p.quantity);
                    const totalUsd = p.totalUsdSpent.toFixed(2);
                    return `${p.asset} — ${qty} — $${totalUsd}`;
                  }),
                );
              }
              parts.push(`Обоснование: ${reason}`);
              if (r.result.action === "buy_coin" && r.result.asset) {
                if (
                  r.result.amountEth != null &&
                  r.result.assetPriceUsd != null &&
                  r.result.assetPriceUsd > 0
                ) {
                  const boughtQty = r.result.amountEth / r.result.assetPriceUsd;
                  parts.push(
                    `Куплено: ${formatAssetQuantity(boughtQty)} ${r.result.asset} (на ${r.result.amountEth} USDT)`,
                  );
                }
                if (r.result.assetPriceUsd != null)
                  parts.push(
                    `Цена покупки: $${r.result.assetPriceUsd} (${r.result.asset})`,
                  );
                if (r.result.termDays != null)
                  parts.push(`Срок: ${r.result.termDays} дн.`);
                if (r.result.termMinutes != null)
                  parts.push(`Срок: ${r.result.termMinutes} мин.`);
                if (r.result.priceReason)
                  parts.push(`Почему эта цена: ${r.result.priceReason}`);
                if (r.result.plans) parts.push(`Планы: ${r.result.plans}`);
              }
              if (r.result.action === "sell_coin" && r.result.asset) {
                if (
                  r.result.amountEth != null &&
                  r.result.assetPriceUsd != null &&
                  r.result.assetPriceUsd > 0
                ) {
                  const soldQty = r.result.amountEth / r.result.assetPriceUsd;
                  parts.push(
                    `Продано: ${formatAssetQuantity(soldQty)} ${r.result.asset} (получено ${r.result.amountEth} USDT)`,
                  );
                }
                if (r.result.assetPriceUsd != null)
                  parts.push(
                    `Цена продажи: $${r.result.assetPriceUsd} (${r.result.asset})`,
                  );
                if (r.result.termDays != null)
                  parts.push(`Срок: ${r.result.termDays} дн.`);
                if (r.result.termMinutes != null)
                  parts.push(`Срок: ${r.result.termMinutes} мин.`);
                if (r.result.priceReason)
                  parts.push(`Почему эта цена: ${r.result.priceReason}`);
                if (r.result.plans) parts.push(`Планы: ${r.result.plans}`);
              }
              const block = parts.join("\n");
              return idx === grouped.demo.length - 1 ? [block] : [block, ""];
            }),
            ...(hasReal
              ? [
                  "",
                  "💼 Реальные сделки с кошельками:",
                  "",
                  ...grouped.real.flatMap((r, idx) => {
                    const isBuy =
                      r.action === "buy_coin" || r.action === "buy_coin_pending";
                    const isSell = r.action === "sell_coin";
                    const header = `• ${r.agentName}: ${
                      isBuy && r.asset
                        ? `Покупка ${r.asset}`
                        : isSell && r.asset
                          ? `Продажа ${r.asset}`
                          : r.action
                    }`;
                    let amountLine: string | undefined;
                    if (isBuy && r.amountEth != null && r.amountUsd != null) {
                      amountLine = `Сумма: ${r.amountEth.toFixed(4)} ETH (≈ ${r.amountUsd.toFixed(2)} USDT)`;
                    } else if (
                      isSell &&
                      r.asset &&
                      r.tokenAmount != null &&
                      r.amountEth != null &&
                      r.amountUsd != null
                    ) {
                      amountLine = `Сумма: ${formatAssetQuantity(r.tokenAmount)} ${r.asset} (получено ≈ ${r.amountEth.toFixed(4)} ETH ≈ ${r.amountUsd.toFixed(2)} USDT)`;
                    } else if (
                      r.amountEth != null &&
                      r.amountUsd != null
                    ) {
                      amountLine = `Сумма: ${r.amountEth.toFixed(4)} ETH (~ ${r.amountUsd.toFixed(2)} USDT)`;
                    }
                    const parts = [header];
                    if (amountLine) parts.push(amountLine);
                    if (r.reason) {
                      const cleaned = r.reason
                        // убираем управляющие и экзотические символы, оставляем буквы, цифры, пунктуацию и пробелы
                        .replace(/[^\p{L}\p{N}\p{P}\p{Z}]/gu, " ")
                        .replace(/\s+/g, " ")
                        .trim();
                      if (cleaned.length >= 5) {
                        parts.push(`Обоснование: ${cleaned}`);
                      }
                    }
                    const block = parts.join("\n");
                    return idx === grouped.real.length - 1
                      ? [block]
                      : [block, ""];
                  }),
                ]
              : []),
          ]
        : [
            `🤖 Крон 24/7 (${new Date().toLocaleString("ru-RU")})`,
            "",
            "Нет активных агентов 24/7.",
          ];
    const res = await sendTelegramMessageToChat(
      lines.join("\n").slice(0, 4096),
      chatId,
    );
    telegramByUser[email] = { sent: res.ok, error: res.error };
  }

  const hintEmpty =
    agents.length === 0
      ? "Локально: запустите npm run cron в отдельном терминале. На сервере: включите «Работать 24/7» и задайте демо-баланс > 0 агенту на странице агента."
      : undefined;

  return NextResponse.json({
    ok: true,
    ran: agents.length,
    results: resultsForJson,
    realResults,
    telegramByUser,
    hintEmpty,
  });
}
