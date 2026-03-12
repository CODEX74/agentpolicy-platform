/**
 * Coinbase CDP REST API client without @coinbase/agentkit (avoids ESM deps in serverless).
 * Uses jsonwebtoken (CJS) for JWT and fetch for HTTP.
 */

import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { logger } from '@/lib/utils/logger';

const CDP_BASE = 'https://api.cdp.coinbase.com/platform';

function getCdpEnv(): { name: string; secret: string } {
  const name = process.env.CDP_API_KEY_NAME;
  let secret = process.env.CDP_API_KEY_PRIVATE_KEY;
  if (!name || !secret?.trim()) {
    throw new Error('CDP_API_KEY_NAME and CDP_API_KEY_PRIVATE_KEY must be set in environment');
  }
  // In env vars PEM is often stored with literal \n — restore real newlines for jwt
  if (secret.includes('-----') && secret.includes('\\n')) {
    secret = secret.replace(/\\n/g, '\n');
  }
  return { name, secret: secret.trim() };
}

/** Detect if secret is PEM (EC key); otherwise assume Ed25519 base64. */
function isPemKey(secret: string): boolean {
  return secret.includes('-----BEGIN');
}

/** Base64url encode (no padding). */
function base64url(b: Buffer | string): string {
  const buf = typeof b === 'string' ? Buffer.from(b, 'utf8') : b;
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Build Ed25519 PKCS8 DER from 64-byte raw key (32 seed + 32 public); we only need the 32-byte seed. */
function ed25519Pkcs8FromBase64(secret: string): Buffer {
  const raw = Buffer.from(secret, 'base64');
  if (raw.length < 32) {
    throw new Error('CDP_API_KEY_PRIVATE_KEY: Ed25519 key must be at least 32 bytes when base64-decoded');
  }
  const seed = raw.subarray(0, 32);
  // PKCS8 DER for Ed25519: prefix (0x30 0x2e ... 0x20) + 32-byte private key
  const prefix = Buffer.from('302e020100300506032b657004220420', 'hex');
  return Buffer.concat([prefix, seed]);
}

/** Build and sign a JWT with Ed25519 (EdDSA). jsonwebtoken does not support EdDSA at runtime. */
function signJwtEd25519(
  payload: Record<string, unknown>,
  keyObject: crypto.KeyObject,
  kid: string,
  jti: string
): string {
  const header = { alg: 'EdDSA', kid, typ: 'JWT', nonce: jti };
  const headerB64 = base64url(JSON.stringify(header));
  const payloadB64 = base64url(JSON.stringify(payload));
  const signingInput = `${headerB64}.${payloadB64}`;
  const sig = crypto.sign(null, Buffer.from(signingInput, 'utf8'), keyObject);
  return `${signingInput}.${base64url(sig)}`;
}

/**
 * Generate a CDP API JWT for the given REST request (method + path).
 * Supports EC (ES256) PEM keys and Ed25519 (EdDSA) base64 keys.
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

  if (isPemKey(secret)) {
    const token = jwt.sign(payload, secret, {
      algorithm: 'ES256',
      header: { alg: 'ES256', kid: name, typ: 'JWT', nonce: jti } as unknown as jwt.JwtHeader,
    });
    return token;
  }

  // Ed25519 key (base64): jsonwebtoken does not support EdDSA at runtime — sign JWT manually with Node crypto
  const pkcs8 = ed25519Pkcs8FromBase64(secret);
  const keyObject = crypto.createPrivateKey({ key: pkcs8, format: 'der', type: 'pkcs8' });
  return signJwtEd25519(payload, keyObject, name, jti);
}

export interface CreateWalletResult {
  walletId: string;
  address: string;
}

/**
 * Create a new CDP server wallet via REST API.
 * JWT uri claim must use full path including /platform (per CDP docs).
 */
export async function createWallet(networkId: string): Promise<CreateWalletResult> {
  const pathForJwt = '/platform/v1/wallets';
  const pathForUrl = '/v1/wallets';
  const token = generateCdpJwt('POST', pathForJwt);
  const res = await fetch(`${CDP_BASE}${pathForUrl}`, {
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
    let parsed: { code?: string; message?: string } | undefined;
    try {
      parsed = JSON.parse(text) as { code?: string; message?: string };
    } catch {
      parsed = undefined;
    }

    // Detect explicit CDP rate limiting on CreateWallet operation
    if (res.status === 429 || parsed?.code === 'resource_exhausted') {
      const rateErr = new Error(
        parsed?.message || 'CDP CreateWallet rate limit exceeded',
      ) as Error & { code?: string; retryAfterSeconds?: number };
      rateErr.code = 'CDP_RATE_LIMIT';
      const retryHeader = res.headers.get('Retry-After');
      if (retryHeader) {
        const retryAfter = Number(retryHeader);
        if (!Number.isNaN(retryAfter) && retryAfter > 0) {
          rateErr.retryAfterSeconds = retryAfter;
        }
      }
      logger.error('CDP createWallet rate limited', { status: res.status, body: text });
      throw rateErr;
    }

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
        : networkId === 'ethereum-mainnet'
          ? process.env.ETHEREUM_RPC_URL ?? 'https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID'
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

    // #region agent log
    fetch('http://127.0.0.1:7866/ingest/f2b1bcb0-5cd1-4cfb-a22c-e4590e10ebab', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Debug-Session-Id': '57b590',
      },
      body: JSON.stringify({
        sessionId: '57b590',
        runId: 'pre-fix',
        hypothesisId: 'H1-H3',
        location: 'src/lib/cdp/rest.ts:getBalanceByAddress',
        message: 'getBalanceByAddress RPC success',
        data: { address, networkId, rpcUrl, hex },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion agent log

    return BigInt(hex).toString();
  } catch (err) {
    logger.error('getBalanceByAddress failed', { address, networkId, err });

    // #region agent log
    fetch('http://127.0.0.1:7866/ingest/f2b1bcb0-5cd1-4cfb-a22c-e4590e10ebab', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Debug-Session-Id': '57b590',
      },
      body: JSON.stringify({
        sessionId: '57b590',
        runId: 'pre-fix',
        hypothesisId: 'H2',
        location: 'src/lib/cdp/rest.ts:getBalanceByAddress',
        message: 'getBalanceByAddress RPC error',
        data: { address, networkId, rpcUrl },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion agent log

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
  const pathForUrl = `/v2/evm/accounts/${encodeURIComponent(params.fromAddress)}/send/transaction`;
  const pathForJwt = `/platform${pathForUrl}`;
  const token = generateCdpJwt('POST', pathForJwt);
  const body: { network: string; transaction: Record<string, unknown> } = {
    network: params.networkId,
    transaction: {
      to: params.toAddress,
      value: `0x${BigInt(params.valueWei).toString(16)}`,
    },
  };
  if (params.data) body.transaction.data = params.data;
  const res = await fetch(`${CDP_BASE}${pathForUrl}`, {
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
