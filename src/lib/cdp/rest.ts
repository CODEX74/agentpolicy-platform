/**
 * Coinbase CDP REST API client without @coinbase/agentkit (avoids ESM deps in serverless).
 * Uses jsonwebtoken (CJS) for JWT and fetch for HTTP.
 */

import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { logger } from '@/lib/utils/logger';

const CDP_BASE = 'https://api.cdp.coinbase.com/platform';

function getCdpEnv() {
  const name = process.env.CDP_API_KEY_NAME;
  const secret = process.env.CDP_API_KEY_PRIVATE_KEY;
  if (!name || !secret?.trim()) {
    throw new Error('CDP_API_KEY_NAME and CDP_API_KEY_PRIVATE_KEY must be set in environment');
  }
  return { name, secret };
}

/**
 * Generate a CDP API JWT for the given REST request (method + path).
 * Supports EC (ES256) PEM keys only.
 */
function generateCdpJwt(method: string, path: string): string {
  const { name, secret } = getCdpEnv();
  const host = 'api.cdp.coinbase.com';
  const uri = `${method} ${host}${path}`;
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 120;
  const jti = crypto.randomBytes(16).toString('hex');
  const payload = {
    sub: name,
    iss: 'cdp',
    aud: 'cdp_service',
    uris: [uri],
    nbf: now,
    iat: now,
    exp,
    jti,
  };
  const token = jwt.sign(payload, secret, {
    algorithm: 'ES256',
    header: { alg: 'ES256', kid: name, typ: 'JWT', nonce: jti } as unknown as jwt.JwtHeader,
  });
  return token;
}

export interface CreateWalletResult {
  walletId: string;
  address: string;
}

/**
 * Create a new CDP server wallet via REST API.
 */
export async function createWallet(networkId: string): Promise<CreateWalletResult> {
  const path = '/v1/wallets';
  const token = generateCdpJwt('POST', path);
  const res = await fetch(`${CDP_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      wallet: { network_id: networkId },
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    logger.error('CDP createWallet failed', { status: res.status, body: text });
    throw new Error(`CDP createWallet failed: ${res.status} ${text.slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    id?: string;
    default_address?: { address_id?: string };
  };
  const walletId = data.id;
  const address = data.default_address?.address_id;
  if (!walletId || !address) {
    throw new Error('CDP createWallet: missing id or default_address.address_id in response');
  }
  return { walletId, address };
}

/**
 * Get ETH/balance for an address via public RPC (no CDP, no ESM).
 */
export async function getBalanceByAddress(address: string, networkId: string): Promise<string> {
  const rpcUrl =
    networkId === 'base-mainnet'
      ? 'https://mainnet.base.org'
      : networkId === 'base-sepolia'
        ? 'https://sepolia.base.org'
        : process.env.BASE_RPC_URL ?? 'https://sepolia.base.org';
  try {
    const res = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_getBalance',
        params: [address, 'latest'],
      }),
    });
    const json = (await res.json()) as { result?: string };
    const hex = json.result ?? '0x0';
    return BigInt(hex).toString();
  } catch (err) {
    logger.error('getBalanceByAddress failed', { address, networkId, err });
    return '0';
  }
}

/**
 * Send a transaction from a CDP wallet (server signer). Uses v2 EVM send endpoint.
 */
export async function sendTransaction(params: {
  networkId: string;
  fromAddress: string;
  toAddress: string;
  valueWei: string;
  data?: string;
}): Promise<{ txHash: string }> {
  const path = `/v2/evm/accounts/${encodeURIComponent(params.fromAddress)}/send/transaction`;
  const token = generateCdpJwt('POST', path);
  const body: { network: string; transaction: Record<string, unknown> } = {
    network: params.networkId,
    transaction: {
      to: params.toAddress,
      value: `0x${BigInt(params.valueWei).toString(16)}`,
    },
  };
  if (params.data) body.transaction.data = params.data;
  const res = await fetch(`${CDP_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    logger.error('CDP sendTransaction failed', { status: res.status, body: text });
    throw new Error(`CDP sendTransaction failed: ${res.status} ${text.slice(0, 200)}`);
  }
  const data = (await res.json()) as { transactionHash?: string };
  const txHash = data.transactionHash;
  if (!txHash) throw new Error('CDP sendTransaction: missing transactionHash in response');
  return { txHash };
}
