import { createPublicKey, verify } from 'node:crypto';

/**
 * DER/SPKI header for an Ed25519 public key.
 *
 * Discord publishes the bare 32 key bytes as hex, but `createPublicKey` only imports a structured
 * key, so the header is prepended to rebuild the SPKI encoding it does accept.
 */
const ED25519_SPKI_HEADER = Buffer.from('302a300506032b6570032100', 'hex');

/** A public key is exactly 32 bytes as hex. */
const PUBLIC_KEY_PATTERN = /^[0-9a-f]{64}$/i;

/** An Ed25519 signature is exactly 64 bytes as hex. */
const SIGNATURE_PATTERN = /^[0-9a-f]{128}$/i;

/** Everything needed to check one interaction request. */
export interface DiscordSignatureInput {
  /** Application public key, 64 hex characters (`DISCORD_PUBLIC_KEY`) */
  publicKey: string;
  /** Value of the `X-Signature-Ed25519` header */
  signature: string;
  /** Value of the `X-Signature-Timestamp` header */
  timestamp: string;
  /** The request body exactly as it arrived, before any JSON parsing */
  rawBody: string;
}

/**
 * Check that Discord, and only Discord, sent this request.
 *
 * The signed bytes are `timestamp + rawBody`. It must be the *raw* body: parsing to JSON and
 * serialising again produces different bytes (key order, whitespace, escaping) and the signature
 * then never matches.
 *
 * Both hex inputs are shape-checked first, so a malformed header returns false instead of throwing
 * from inside the crypto layer — a prober must not be able to turn a bad header into a 500.
 *
 * @param input - Public key, signature, timestamp and raw body of the request
 * @returns true when the signature is valid for this exact payload
 */
export function isValidDiscordSignature({
  publicKey,
  signature,
  timestamp,
  rawBody,
}: DiscordSignatureInput): boolean {
  if (!PUBLIC_KEY_PATTERN.test(publicKey)) return false;
  if (!SIGNATURE_PATTERN.test(signature)) return false;

  const key = createPublicKey({
    key: Buffer.concat([ED25519_SPKI_HEADER, Buffer.from(publicKey, 'hex')]),
    format: 'der',
    type: 'spki',
  });

  return verify(
    null,
    Buffer.from(timestamp + rawBody),
    key,
    Buffer.from(signature, 'hex'),
  );
}
