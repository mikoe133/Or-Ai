import { Inject, Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ProductionDomainSchema, MachineContentOperationSchema, MachineProjectOperationSchema, ProductionRunOperationSchema } from '@orai/contracts/admin';
import { CatalogAdminAccessService, type CatalogAdminAccess } from '../catalog/admin-access.service';
import { machineInvalid, machineDenied } from '../catalog/machine-authorization';
import { RequestRateService } from '../redemption/request-rate.service';
import { APP_CONFIG, type AppConfiguration } from '../config/configuration';
import { ApiException } from '../common/http-errors';
import { parseInput } from '../common/parse-input';
import { MachineCredentialsService } from './machine-credentials.service';

export const MACHINE_OPERATION = 'orai.machine-operation';
const readOperations = new Set(['connection_get', 'upload_status', 'list', 'get', 'skill_list',
  'skill_version_get', 'context_bundle_get', 'references_validate', 'skill_reference_get', 'assessment_validate', 'experience_validate',
  'project_list','project_get','project_plan_get','project_plan_validate','project_method_get','project_production_list','project_production_get','project_context_get','project_method_reference_get','production_run_get','production_run_list','module_attempt_get']);
export type MachineRequest = Request & { machine: CatalogAdminAccess; machineToken: string; machineDomain: string };
@Injectable()
export class MachineRequestGuard implements CanActivate {
  constructor(private readonly administrators: CatalogAdminAccessService, private readonly rates: RequestRateService,
    private readonly credentials: MachineCredentialsService, private readonly reflector: Reflector,
    @Inject(APP_CONFIG) private readonly config: AppConfiguration) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<MachineRequest>();
    context.switchToHttp().getResponse().setHeader('Cache-Control', 'private, no-store');
    const declared = this.reflector.get<string>(MACHINE_OPERATION, context.getHandler()) ?? 'unknown';
    const tool = MachineContentOperationSchema.or(MachineProjectOperationSchema).or(ProductionRunOperationSchema).safeParse(request.params.operation);
    const operation = declared === 'content_tool' ? tool.success ? tool.data : 'unknown' : declared;
    const domain = parseInput(ProductionDomainSchema, request.params.domain);
    const token = /^Bearer (orai_mcp_[A-Za-z0-9_-]{43})$/.exec(request.headers.authorization ?? '')?.[1] ?? '';
    try {
      if (this.config.environment === 'production') throw new ApiException('SERVICE_UNAVAILABLE', '远程机器接入尚未启用', 503);
      // Tool reads use POST for structured selectors. They must not consume the
      // browser write budget or make the operator's session unusable mid-batch.
      const read = readOperations.has(operation);
      await this.rates.check(read ? 'machine-read-ip' : 'machine-write-ip',
        request.ip ?? request.socket.remoteAddress ?? 'unknown',
        read ? this.config.security.readIpLimit : this.config.security.writeIpLimit, 60);
      if (!token) throw machineInvalid();
      const access = await this.administrators.authorizeMachine(token, domain);
      await this.rates.check('machine-credential', access.machineCredentialId!, 600, 60);
      // Local machine APIs accept explicit bearer authorization only. Browser
      // Cookie APIs keep their separate Origin and CSRF guard unchanged.
      if (request.headers.cookie || request.headers.origin) throw machineDenied();
      if (request.method !== 'GET') {
        const mime = request.headers['content-type']?.split(';')[0]?.trim().toLowerCase();
        if (mime !== (operation === 'upload_file' ? 'application/octet-stream' : 'application/json'))
          throw new ApiException('VALIDATION_ERROR', '机器请求格式不正确', 400);
      }
      request.machine = access; request.machineToken = token; request.machineDomain = domain;
      return true;
    } catch (error) {
      await this.credentials.record(token, domain, operation, error, request.params.id, request.body?.requestId);
      throw error;
    }
  }
}
