import { generateKeyPairSync, sign } from 'node:crypto';

import { isValidDiscordSignature } from '../verify-signature';

/** Bytes of DER/SPKI before the raw 32-byte Ed25519 key. */
const SPKI_HEADER_LENGTH = 12;

const { publicKey, privateKey } = generateKeyPairSync('ed25519');

/** The raw key as 64 hex characters — the form the Discord portal shows. */
const publicKeyHex = publicKey
  .export({ format: 'der', type: 'spki' })
  .subarray(SPKI_HEADER_LENGTH)
  .toString('hex');

const timestamp = '1756700000';
const rawBody = '{"type":1}';

/**
 * Sign a payload the way Discord does: over `timestamp + rawBody`.
 * @param signedTimestamp - Timestamp that goes into the signed bytes
 * @param signedBody - Raw request body that goes into the signed bytes
 * @returns The signature as hex
 */
function signPayload(signedTimestamp: string, signedBody: string): string {
  return sign(
    null,
    Buffer.from(signedTimestamp + signedBody),
    privateKey,
  ).toString('hex');
}

describe('isValidDiscordSignature', () => {
  it('chấp nhận chữ ký thật của đúng payload', () => {
    expect(
      isValidDiscordSignature({
        publicKey: publicKeyHex,
        signature: signPayload(timestamp, rawBody),
        timestamp,
        rawBody,
      }),
    ).toBe(true);
  });

  it('từ chối khi body bị đổi dù chỉ một ký tự', () => {
    expect(
      isValidDiscordSignature({
        publicKey: publicKeyHex,
        signature: signPayload(timestamp, rawBody),
        timestamp,
        rawBody: '{"type":2}',
      }),
    ).toBe(false);
  });

  it('từ chối khi timestamp bị đổi — timestamp cũng nằm trong phần được ký', () => {
    expect(
      isValidDiscordSignature({
        publicKey: publicKeyHex,
        signature: signPayload(timestamp, rawBody),
        timestamp: '1756700001',
        rawBody,
      }),
    ).toBe(false);
  });

  it('trả false chứ không ném khi chữ ký không phải hex', () => {
    expect(
      isValidDiscordSignature({
        publicKey: publicKeyHex,
        signature: 'không-phải-hex',
        timestamp,
        rawBody,
      }),
    ).toBe(false);
  });

  it('trả false chứ không ném khi public key sai độ dài', () => {
    expect(
      isValidDiscordSignature({
        publicKey: 'abcd',
        signature: signPayload(timestamp, rawBody),
        timestamp,
        rawBody,
      }),
    ).toBe(false);
  });
});
