import { Inject, Injectable } from '@nestjs/common';
import { createHmac } from 'node:crypto';
import type { Request, Response } from 'express';
import { APP_CONFIG, type AppConfiguration } from '../config/configuration';
import { ApiException } from '../common/http-errors';
import type { DataScope } from '../generated/prisma/client';
import { credentialDigest, equalSecret, newCredential } from './credentials';

declare const browserBrand: unique symbol;
export interface BrowserMutationAccess { readonly [browserBrand]: true }
const proofs = new WeakMap<object, { issuer: BrowserSecurityService; scope: DataScope; browserDigest: string; sessionToken?: string; expiresAt: number }>();

@Injectable()
export class BrowserSecurityService {
  constructor(@Inject(APP_CONFIG) private readonly configuration: AppConfiguration) {}
  get scope(): DataScope { return this.configuration.environment === 'production' ? 'LIVE' : 'DEMO'; }
  private get secureCookies() { return this.configuration.environment === 'production' || this.configuration.security.origins.some(origin => origin.startsWith('https://')); }
  get sessionCookieName() { return this.secureCookies ? '__Host-orai_session' : 'orai_session'; }
  get csrfCookieName() { return this.secureCookies ? '__Host-orai_csrf' : 'orai_csrf'; }
  private cookieOptions() { return { httpOnly: true, secure: this.secureCookies, sameSite: 'strict' as const, path: '/' }; }

  readCookie(request: Request, name: string) {
    const header = request.headers.cookie ?? '';
    if (header.length > 8192) throw new ApiException('FORBIDDEN', '浏览器凭据格式不正确', 403);
    const matches = header.split(';').map(value => value.trim()).filter(value => value.startsWith(name + '='));
    if (matches.length > 1) throw new ApiException('FORBIDDEN', '浏览器凭据格式不正确', 403);
    return matches[0]?.slice(name.length + 1);
  }
  readSessionToken(request: Request) {
    const token = this.readCookie(request, this.sessionCookieName);
    return token && /^[A-Za-z0-9_-]{43}$/.test(token) ? token : undefined;
  }
  checkOrigin(request: Request, mutation = false, format: 'json' | 'binary' = 'json') {
    const origin = request.get('origin');
    if (request.get('sec-fetch-site') === 'cross-site' || (origin && !this.configuration.security.origins.includes(origin)) || (mutation && !origin)) {
      throw new ApiException('ORIGIN_FORBIDDEN', '请从本站页面发起操作', 403);
    }
    const contentType = format === 'binary' ? /^application\/octet-stream(?:\s*;|$)/i : /^application\/json(?:\s*;|$)/i;
    if (mutation && !contentType.test(request.get('content-type') ?? '')) {
      throw new ApiException('VALIDATION_ERROR', format === 'binary' ? '需要二进制上传请求' : '需要 JSON 请求', 400);
    }
  }
  private signature(timestamp: string, nonce: string) {
    return createHmac('sha256', this.configuration.security.csrfSigningKey).update(timestamp + ':' + nonce + ':csrf-v1').digest('base64url');
  }
  private validCsrf(token: unknown): token is string {
    if (typeof token !== 'string' || !/^\d{10}\.[A-Za-z0-9_-]{43}\.[A-Za-z0-9_-]{43}$/.test(token)) return false;
    const [timestamp, nonce, signature] = token.split('.') as [string, string, string];
    const age = Math.floor(Date.now() / 1000) - Number(timestamp);
    return age >= -30 && age < this.configuration.security.csrfTtlSeconds && equalSecret(signature, this.signature(timestamp, nonce));
  }
  csrfContext(request: Request, response: Response) {
    let token = this.readCookie(request, this.csrfCookieName);
    if (!this.validCsrf(token)) {
      const timestamp = String(Math.floor(Date.now() / 1000)), nonce = newCredential();
      token = timestamp + '.' + nonce + '.' + this.signature(timestamp, nonce);
    }
    const issuedAt = Number(token.split('.')[0]);
    const remaining = Math.max(1, issuedAt + this.configuration.security.csrfTtlSeconds - Math.floor(Date.now() / 1000));
    response.cookie(this.csrfCookieName, token, { ...this.cookieOptions(), maxAge: remaining * 1000 });
    return token;
  }
  authorizeMutation(request: Request, format: 'json' | 'binary' = 'json'): BrowserMutationAccess {
    this.checkOrigin(request, true, format);
    const cookie = this.readCookie(request, this.csrfCookieName), header = request.get('x-csrf-token');
    if (!this.validCsrf(cookie) || !header || !equalSecret(cookie, header)) throw new ApiException('CSRF_INVALID', '页面授权已过期，请刷新后重试', 403);
    const proof = Object.freeze({}) as BrowserMutationAccess;
    proofs.set(proof, { issuer: this, scope: this.scope, browserDigest: credentialDigest(cookie),
      sessionToken: this.readSessionToken(request), expiresAt: Date.now() + 30_000 });
    return proof;
  }
  requireMutation(access: BrowserMutationAccess) {
    const proof = typeof access === 'object' && access !== null ? proofs.get(access) : undefined;
    if (!proof || proof.issuer !== this || proof.expiresAt <= Date.now() || proof.scope !== this.scope) throw new ApiException('FORBIDDEN', '需要有效的页面授权', 403);
    return proof;
  }
  setSessionCookie(response: Response, token: string, expiresAt: Date) {
    response.cookie(this.sessionCookieName, token, { ...this.cookieOptions(), expires: expiresAt, maxAge: Math.max(1, expiresAt.getTime() - Date.now()) });
  }
  clearSessionCookie(response: Response, csrf = false) {
    response.clearCookie(this.sessionCookieName, this.cookieOptions());
    if (csrf) response.clearCookie(this.csrfCookieName, this.cookieOptions());
  }
}
