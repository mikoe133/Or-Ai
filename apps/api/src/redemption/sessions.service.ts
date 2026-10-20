import { Inject, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { APP_CONFIG, type AppConfiguration } from '../config/configuration';
import { DatabaseService } from '../database/database.service';
import { ApiException } from '../common/http-errors';
import { Prisma, type DataScope, type Entitlement } from '../generated/prisma/client';
import { BrowserSecurityService } from './browser-security.service';
import { credentialDigest, newCredential } from './credentials';

declare const anonymousBrand: unique symbol;
export interface AnonymousAccess { readonly sessionId: string; readonly scope: DataScope; readonly [anonymousBrand]: true }
const grants = new WeakMap<object, { issuer: SessionsService; digest: string }>();

@Injectable()
export class SessionsService {
  constructor(private readonly database: DatabaseService, private readonly browser: BrowserSecurityService,
    @Inject(APP_CONFIG) private readonly configuration: AppConfiguration) {}
  async fromToken(token: unknown): Promise<AnonymousAccess | undefined> {
    if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) return undefined;
    const digest = credentialDigest(token);
    const session = await this.database.client.accessSession.findFirst({ where: { tokenDigest: digest,
      scope: this.browser.scope, revokedAt: null, expiresAt: { gt: new Date() } } });
    if (!session) return undefined;
    const access = Object.freeze({ sessionId: session.id, scope: session.scope }) as AnonymousAccess;
    grants.set(access, { issuer: this, digest });
    return access;
  }
  fromRequest(request: Request) { return this.fromToken(this.browser.readSessionToken(request)); }
  identity(access: AnonymousAccess) {
    const proof = typeof access === 'object' && access !== null ? grants.get(access) : undefined;
    if (!proof || proof.issuer !== this || access.scope !== this.browser.scope) throw new ApiException('FORBIDDEN', '需要有效的匿名访问授权', 403);
    return proof;
  }
  async fresh(access: AnonymousAccess, tx?: Prisma.TransactionClient) {
    const proof = this.identity(access), client = tx ?? this.database.client;
    if (tx) await tx.$queryRaw(Prisma.sql`SELECT id FROM orai.access_sessions WHERE id = ${access.sessionId}::uuid FOR SHARE`);
    const session = await client.accessSession.findFirst({ where: { id: access.sessionId, tokenDigest: proof.digest,
      scope: access.scope, revokedAt: null, expiresAt: { gt: new Date() } } });
    if (!session) throw new ApiException('AUTH_REQUIRED', '本机授权已失效，请凭有效兑换码恢复', 401);
    return session;
  }
  async requireRequest(request: Request) {
    const access = await this.fromRequest(request);
    if (!access) throw new ApiException('AUTH_REQUIRED', '请先兑换或恢复本机权益', 401);
    return access;
  }
  async attach(tx: Prisma.TransactionClient, entitlement: Entitlement, token?: string) {
    const now = new Date();
    let session = token ? await tx.accessSession.findFirst({ where: { tokenDigest: credentialDigest(token),
      scope: entitlement.scope, revokedAt: null, expiresAt: { gt: now } } }) : null;
    let newSession: { token: string; expiresAt: Date } | undefined;
    if (session) {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM orai.access_sessions WHERE id = ${session.id}::uuid FOR SHARE`);
      session = await tx.accessSession.findFirst({ where: { id: session.id, tokenDigest: credentialDigest(token!),
        scope: entitlement.scope, revokedAt: null, expiresAt: { gt: new Date() } } });
    }
    if (!session) {
      const generated = newCredential(), expiresAt = new Date(now.getTime() + this.configuration.security.sessionDays * 86_400_000);
      session = await tx.accessSession.create({ data: { tokenDigest: credentialDigest(generated), scope: entitlement.scope, createdAt: now, expiresAt } });
      newSession = { token: generated, expiresAt };
    }
    await tx.accessGrant.upsert({ where: { sessionId_entitlementId: { sessionId: session.id, entitlementId: entitlement.id } },
      create: { sessionId: session.id, entitlementId: entitlement.id, scope: entitlement.scope }, update: { revokedAt: null } });
    return newSession;
  }
  async revoke(access: AnonymousAccess) {
    this.identity(access);
    const now = new Date();
    await this.database.client.$transaction(async tx => {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM orai.access_sessions WHERE id = ${access.sessionId}::uuid FOR UPDATE`);
      const session = await tx.accessSession.findFirst({ where: { id: access.sessionId, scope: access.scope, tokenDigest: this.identity(access).digest } });
      if (!session || session.revokedAt) return;
      await tx.accessSession.update({ where: { id: session.id }, data: { revokedAt: now } });
      await tx.accessGrant.updateMany({ where: { sessionId: session.id, revokedAt: null }, data: { revokedAt: now } });
    });
  }
  // Caller already holds affected entitlement locks. Preserve other grants in a
  // multi-product browser; revoke the session itself when no grant remains.
  async lockEntitlementSessions(tx: Prisma.TransactionClient, entitlementIds: string[]) {
    if (!entitlementIds.length) return [];
    const affected = await tx.accessGrant.findMany({ where: { entitlementId: { in: entitlementIds }, revokedAt: null }, select: { sessionId: true } });
    const sessionIds = [...new Set(affected.map(value => value.sessionId))].sort();
    for (const id of sessionIds) await tx.$queryRaw(Prisma.sql`SELECT id FROM orai.access_sessions WHERE id = ${id}::uuid FOR UPDATE`);
    return sessionIds;
  }
  async revokeEntitlementGrants(tx: Prisma.TransactionClient, entitlementIds: string[], now: Date) {
    if (!entitlementIds.length) return;
    const sessionIds = await this.lockEntitlementSessions(tx, entitlementIds);
    await tx.accessGrant.updateMany({ where: { entitlementId: { in: entitlementIds }, revokedAt: null }, data: { revokedAt: now } });
    for (const id of sessionIds) {
      await tx.accessSession.updateMany({ where: { id, revokedAt: null, grants: { none: { revokedAt: null } } }, data: { revokedAt: now } });
    }
  }
}
