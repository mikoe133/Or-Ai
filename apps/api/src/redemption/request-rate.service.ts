import { Inject, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { APP_CONFIG, type AppConfiguration } from '../config/configuration';
import { DatabaseService } from '../database/database.service';
import { RateLimitException } from '../common/http-errors';
import { credentialDigest } from './credentials';

@Injectable()
export class RequestRateService {
  constructor(private readonly database: DatabaseService, @Inject(APP_CONFIG) private readonly configuration: AppConfiguration) {}
  async check(kind: string, subject: string, maximum: number, seconds: number) {
    const scope = this.configuration.environment === 'production' ? 'LIVE' : 'DEMO';
    const key = credentialDigest(scope + ':' + kind + ':' + subject);
    // One atomic statement shares limits across processes/containers. Neither
    // plaintext IPs, codes, cookies nor tokens are stored in this control table.
    const rows = await this.database.client.$queryRawUnsafe<{ hits: number; windowEndsAt: Date }[]>(`
      INSERT INTO orai.request_rate_buckets (key_hash, scope, hits, window_ends_at)
      VALUES ($1, $2::orai."DataScope", 1, statement_timestamp() + $3::integer * INTERVAL '1 second')
      ON CONFLICT (key_hash) DO UPDATE SET
        hits = CASE WHEN request_rate_buckets.window_ends_at <= statement_timestamp() THEN 1
          ELSE LEAST(request_rate_buckets.hits + 1, $4::integer + 1) END,
        window_ends_at = CASE WHEN request_rate_buckets.window_ends_at <= statement_timestamp()
          THEN statement_timestamp() + $3::integer * INTERVAL '1 second' ELSE request_rate_buckets.window_ends_at END
      RETURNING hits, window_ends_at AS "windowEndsAt"`, key, scope, seconds, maximum);
    if (rows[0]!.hits > maximum) throw new RateLimitException(Math.max(1, Math.ceil((rows[0]!.windowEndsAt.getTime() - Date.now()) / 1000)));
  }
  forRequest(request: Request, mutation: boolean) {
    // Express accepts forwarded IPs only from explicitly configured proxy CIDRs.
    const redemption = mutation && /^\/api\/(?:redemptions\/|me\/redemptions\/|me\/entitlements\/bind(?:\/|$))/.test(request.path);
    return this.check(redemption ? 'anonymous-write-ip' : mutation ? 'anonymous-runtime-write-ip' : 'anonymous-read-ip',
      request.ip ?? request.socket.remoteAddress ?? 'unknown', redemption ? this.configuration.security.claimIpLimit
        : mutation ? this.configuration.security.writeIpLimit : this.configuration.security.readIpLimit,
      redemption ? this.configuration.security.claimWindowSeconds : 60);
  }
  forCode(digest: string) { return this.check('redemption-code', digest, this.configuration.security.claimCodeLimit, this.configuration.security.claimWindowSeconds); }
}
