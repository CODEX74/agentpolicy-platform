/**
 * DEX-слой для реальных свапов на Ethereum mainnet.
 * Используется Uniswap V2 Router (swapExactETHForTokens / swapExactTokensForTokens)
 * для маршрутов ETH → TOKEN и TOKEN → USDT. Работает только при walletNetworkId === 'ethereum-mainnet'.
 */

import { type Address, encodeFunctionData, parseAbi } from "viem";
import { type PublicClient } from "viem";

// --- Ethereum mainnet ---
const WETH: Address = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const USDT: Address = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
const UNISWAP_V2_ROUTER: Address = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";

/** Тикер → адрес ERC-20 на Ethereum mainnet (топ токены с ликвидностью на Uniswap V2). */
export const ETHEREUM_TOKEN_WHITELIST: Record<string, Address> = {
  ETH: WETH,
  WETH,
  BTC: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599" as Address, // WBTC
  WBTC: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599" as Address,
  USDT,
  USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as Address,
  DAI: "0x6B175474E89094C44Da98b954Eedeac495271d0F" as Address,
  UNI: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984" as Address,
  LINK: "0x514910771AF9Ca656af840dff83E8264EcF986CA" as Address,
};

/** Decimals по адресу токена (lowercase). */
export const ETHEREUM_TOKEN_DECIMALS: Record<string, number> = {
  [WETH.toLowerCase()]: 18,
  "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599": 8, // WBTC
  [USDT.toLowerCase()]: 6,
  "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": 6, // USDC
  "0x6b175474e89094c44da98b954eedeac495271d0f": 18, // DAI
  "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984": 18, // UNI
  "0x514910771af9ca656af840dff83e8264ecf986ca": 18, // LINK
};

const ROUTER_ABI = parseAbi([
  "function getAmountsOut(uint256 amountIn, address[] path) view returns (uint256[] amounts)",
  "function swapExactETHForTokens(uint256 amountOutMin, address[] path, address to, uint256 deadline) payable returns (uint256[] amounts)",
  "function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] path, address to, uint256 deadline) returns (uint256[] amounts)",
]);

const DEFAULT_SLIPPAGE_BPS = 100; // 1%

export interface SwapCalldataResult {
  to: Address;
  data: `0x${string}`;
  value: bigint;
}

/**
 * Возвращает адрес токена по тикеру (ETH, BTC, USDT и т.д.) или null, если не в whitelist.
 */
export function getTokenAddressByTicker(ticker: string): Address | null {
  const key = (ticker || "").trim().toUpperCase();
  return ETHEREUM_TOKEN_WHITELIST[key] ?? null;
}

export function getTokenDecimals(tokenAddress: Address): number {
  return ETHEREUM_TOKEN_DECIMALS[tokenAddress.toLowerCase()] ?? 18;
}

/**
 * Строит calldata для свапа ETH → TOKEN.
 * value = amountInWei передаётся в транзакции; to = Uniswap V2 Router.
 */
export async function getSwapCalldataETHToToken(params: {
  amountInWei: bigint;
  tokenOut: Address;
  recipient: Address;
  slippageBps?: number;
  publicClient?: PublicClient;
}): Promise<SwapCalldataResult> {
  const { amountInWei, tokenOut, recipient, publicClient } = params;
  const slippageBps = params.slippageBps ?? DEFAULT_SLIPPAGE_BPS;
  const path: Address[] = [WETH, tokenOut];
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 300); // 5 min

  let amountOutMin = BigInt(0);
  if (publicClient) {
    try {
      const amounts = await publicClient.readContract({
        address: UNISWAP_V2_ROUTER,
        abi: ROUTER_ABI,
        functionName: "getAmountsOut",
        args: [amountInWei, path],
      });
      const out = amounts[amounts.length - 1];
      if (out != null)
        amountOutMin = (out * BigInt(10000 - slippageBps)) / BigInt(10000);
    } catch {
      // при ошибке (нет пула и т.д.) оставляем 0 — транзакция может откатиться
    }
  }

  const data = encodeFunctionData({
    abi: ROUTER_ABI,
    functionName: "swapExactETHForTokens",
    args: [amountOutMin, path, recipient, deadline],
  });

  return {
    to: UNISWAP_V2_ROUTER,
    data,
    value: amountInWei,
  };
}

/**
 * Строит calldata для свапа TOKEN → USDT.
 * value = 0; перед вызовом отправитель должен сделать approve(router, amountIn).
 */
export async function getSwapCalldataTokenToUSDT(params: {
  tokenIn: Address;
  amountInWei: bigint;
  recipient: Address;
  slippageBps?: number;
  publicClient?: PublicClient;
}): Promise<SwapCalldataResult> {
  const { tokenIn, amountInWei, recipient, publicClient } = params;
  const slippageBps = params.slippageBps ?? DEFAULT_SLIPPAGE_BPS;
  const path: Address[] = tokenIn === WETH ? [WETH, USDT] : [tokenIn, USDT];
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 300);

  let amountOutMin = BigInt(0);
  if (publicClient) {
    try {
      const amounts = await publicClient.readContract({
        address: UNISWAP_V2_ROUTER,
        abi: ROUTER_ABI,
        functionName: "getAmountsOut",
        args: [amountInWei, path],
      });
      const out = amounts[amounts.length - 1];
      if (out != null)
        amountOutMin = (out * BigInt(10000 - slippageBps)) / BigInt(10000);
    } catch {
      // при ошибке оставляем 0
    }
  }

  const data = encodeFunctionData({
    abi: ROUTER_ABI,
    functionName: "swapExactTokensForTokens",
    args: [amountInWei, amountOutMin, path, recipient, deadline],
  });

  return {
    to: UNISWAP_V2_ROUTER,
    data,
    value: BigInt(0),
  };
}

const ERC20_ABI = parseAbi([
  "function balanceOf(address account) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
]);

/**
 * Calldata для approve(router, amount) — вызывать с кошелька владельца токена перед swap Token→USDT.
 */
export function getApproveCalldata(
  token: Address,
  amountWei: bigint,
): { to: Address; data: `0x${string}` } {
  const data = encodeFunctionData({
    abi: ERC20_ABI,
    functionName: "approve",
    args: [UNISWAP_V2_ROUTER, amountWei],
  });
  return { to: token, data };
}

/**
 * Читает баланс ERC-20 у адреса.
 */
export async function getTokenBalance(
  publicClient: PublicClient,
  token: Address,
  account: Address,
): Promise<bigint> {
  return publicClient.readContract({
    address: token,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [account],
  });
}
