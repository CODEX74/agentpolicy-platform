import crypto from 'crypto';

const ALG = 'aes-256-gcm';
const IV_LENGTH = 12; // GCM recommended IV length
const TAG_LENGTH = 16;

function getRawKey(): string {
  const key = process.env.WALLET_ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET;
  if (!key || key.length < 16) {
    throw new Error(
      'WALLET_ENCRYPTION_KEY or NEXTAUTH_SECRET must be set and reasonably long to encrypt wallet private keys',
    );
  }
  return key;
}

function getAesKey(): Buffer {
  const raw = getRawKey();
  // Derive 32-byte key from secret via SHA-256
  return crypto.createHash('sha256').update(raw, 'utf8').digest();
}

export function encryptPrivateKey(privateKey: string): string {
  const normalized = privateKey.trim().toLowerCase().replace(/^0x/, '');
  const key = getAesKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALG, key, iv);
  const plaintext = Buffer.from(normalized, 'hex');
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Store iv + tag + ciphertext as base64
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

export function decryptPrivateKey(ciphertextB64: string): `0x${string}` {
  const key = getAesKey();
  const buf = Buffer.from(ciphertextB64, 'base64');
  if (buf.length <= IV_LENGTH + TAG_LENGTH) {
    throw new Error('Invalid encrypted private key');
  }
  const iv = buf.subarray(0, IV_LENGTH);
  const tag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = buf.subarray(IV_LENGTH + TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALG, key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return `0x${decrypted.toString('hex')}` as `0x${string}`;
}

