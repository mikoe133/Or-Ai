import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { ApiException } from '../common/http-errors';

export class AccountTokenCipher {
  private readonly key: Buffer;
  constructor(key: string) {
    this.key = Buffer.from(key, 'base64url');
    if (!/^[A-Za-z0-9_-]{43}$/.test(key) || this.key.length !== 32 || this.key.toString('base64url') !== key) throw new Error('Invalid account session encryption key');
  }
  seal(value: string, context: string) {
    if (!value || value.length > 32768 || !context || context.length > 120) throw new Error('Invalid account session credential');
    const nonce = randomBytes(12), cipher = createCipheriv('aes-256-gcm', this.key, nonce);
    cipher.setAAD(Buffer.from(context));
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    return ['v1', nonce.toString('base64url'), encrypted.toString('base64url'), cipher.getAuthTag().toString('base64url')].join('.');
  }
  open(value: string, context: string) {
    try {
      if (value.length > 50000 || !/^v1\.[A-Za-z0-9_-]{16}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{22}$/.test(value)) throw new Error();
      const [, nonce, encrypted, tag] = value.split('.');
      const decipher = createDecipheriv('aes-256-gcm', this.key, Buffer.from(nonce!, 'base64url'));
      decipher.setAAD(Buffer.from(context));decipher.setAuthTag(Buffer.from(tag!, 'base64url'));
      return Buffer.concat([decipher.update(Buffer.from(encrypted!, 'base64url')), decipher.final()]).toString('utf8');
    } catch { throw new ApiException('AUTH_REQUIRED', '账户会话已失效，请重新登录', 401); }
  }
}
