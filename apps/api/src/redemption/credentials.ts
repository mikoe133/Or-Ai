import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
export const newCredential = () => randomBytes(32).toString('base64url');
export const credentialDigest = (value: string) => createHash('sha256').update(value).digest('hex');
export function equalSecret(left: string, right: string) {
  const a = Buffer.from(left), b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}
