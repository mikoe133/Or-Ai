import { Injectable } from '@nestjs/common';
import { createHmac } from 'node:crypto';
import type { Request } from 'express';
import { IdSchema } from '@orai/contracts';
import { MachineUploadPrepareSchema, MachineUploadTargetSchema, MachineUploadSchema, MachineConnectionSchema } from '@orai/contracts/admin';
import { DatabaseService } from '../database/database.service';
import { CatalogAdminAccessService, type CatalogAdminAccess } from '../catalog/admin-access.service';
import { machineDigest, machineDenied } from '../catalog/machine-authorization';
import { ApiException } from '../common/http-errors';
import { parseInput } from '../common/parse-input';
import { ProjectOriginalFilesService } from './project-original-files.service';
import { FilesService } from './files.service';
import { SkillFilesService } from './skill-files.service';
import { AdminMutationService } from './admin-mutation.service';
import { credentialDto } from './machine-credentials.service';
import type { z } from 'zod';

type Target = z.infer<typeof MachineUploadTargetSchema>;
@Injectable()
export class MachineUploadService {
  constructor(private readonly database: DatabaseService, private readonly administrators: CatalogAdminAccessService,
    private readonly mutations: AdminMutationService, private readonly files: FilesService, private readonly skillFiles: SkillFilesService, private readonly originals: ProjectOriginalFilesService) {}
  async connection(access: CatalogAdminAccess) {
    await this.administrators.require(access);
    const row = await this.database.client.machineCredential.findUniqueOrThrow({ where: { id: access.machineCredentialId! } });
    return MachineConnectionSchema.parse({ credential: credentialDto(row), stage: 'content',
      capabilities: ['connection_get', ...(row.permissions.some(p => p === 'content:write' || p === 'skills:write')
        ? ['upload_prepare', 'upload_status', 'upload_file', 'upload_complete'] : []),
        ...(row.permissions.includes('content:read') ? [row.domain + '_list', row.domain + '_get'] : []),
        ...(row.permissions.includes('content:write') && row.permissions.includes('skills:read') &&
          (row.domain !== 'experience' || row.permissions.includes('context:read')) ? [row.domain + '_draft_save'] : []),
        ...(row.domain === 'assessment' && row.permissions.includes('content:write') ? ['assessment_validate'] : []),
        ...(row.domain === 'experience' && ['content:write','skills:read','context:read'].every(p => row.permissions.includes(p)) ? ['experience_validate'] : []),
        ...(row.permissions.includes('skills:read') ? [row.domain + '_skill_list', row.domain + '_skill_version_get'] : []),
        ...(row.permissions.includes('skills:write') ? [row.domain + '_skill_draft_save',
          ...(row.permissions.includes('skills:read') ? [row.domain + '_skill_draft_clone'] : [])] : []),
        ...(row.permissions.includes('context:read') && row.permissions.includes('skills:read') &&
          (row.domain !== 'experience' || row.permissions.includes('content:read')) ?
          ['context_bundle_get', 'references_validate', 'skill_reference_get'] : []),
        ...(row.workspaceId ? [
          ...(row.permissions.includes('projects:read') ? ['project_list','project_get','project_plan_get','project_plan_validate'] : []),
          ...(row.permissions.includes('projects:read') && row.permissions.includes('context:read') ? ['project_context_get'] : []),
          ...(row.permissions.includes('projects:create') && row.permissions.includes('projects:write') ? ['project_bootstrap'] : []),
          ...(row.permissions.includes('projects:write') ? ['project_profile_save','project_plan_save'] : []),
          ...(row.permissions.includes('projects:read') ? ['production_run_get','production_run_list'] : []),
          ...(row.domain==='assessment'&&['projects:read','projects:write'].every(p=>row.permissions.includes(p)) ? ['production_run_create','production_run_cancel'] : []),
          ...(['projects:read','skills:read','context:read'].every(p=>row.permissions.includes(p)) ? ['module_attempt_get',
            ...(row.permissions.includes('content:write') ? ['module_attempt_claim','module_attempt_event','module_attempt_complete','module_attempt_renew'] : [])] : []),
          ...(row.permissions.includes('methods:create') ? ['project_method_create', ...(row.permissions.includes('skills:read') ? ['project_method_capture'] : [])] : []),
          ...(row.permissions.includes('projects:read') && row.permissions.includes('skills:read') ? ['project_method_get','project_method_reference_get','project_production_list','project_production_get'] : []),
          ...(['content:write','skills:read','context:read'].every(p => row.permissions.includes(p)) ? ['project_draft_save','project_production_save'] : []),
        ] : []),
      ] });
  }
  private targetAccess(access: CatalogAdminAccess, target: Target, uploadId?: string, ticketDigest?: string) {
    return this.administrators.restrictMachine(access, { permission: target.type !== 'skill_reference' ? 'content:write' : 'skills:write',
      target, ...(uploadId ? { uploadId } : {}), ...(ticketDigest ? { ticketDigest } : {}) });
  }
  private ticket(token: string, id: string, expiresAt: Date) {
    // Reproducible only with the bearer: a lost prepare response can be retried
    // without persisting a plaintext ticket or rotating an in-flight upload.
    return createHmac('sha256', token).update('orai-upload-v1:' + id + ':' + expiresAt.toISOString()).digest('base64url');
  }
  async prepare(access: CatalogAdminAccess, token: string, domain: string, input: unknown) {
    const body = parseInput(MachineUploadPrepareSchema, input), target = body.target;
    const scoped = await this.targetAccess(access, target);
    const metadata = { requestId: body.requestId, fileName: body.fileName, mimeType: body.mimeType, byteSize: body.byteSize, checksum: body.checksum };
    // The common services own quotas, validation, streaming and immutable files.
    // Both steps use per-credential idempotency, so interruption between them is
    // recoverable without orphan duplication.
    const file = target.type === 'project_original' ? await this.originals.prepare(scoped, { ...metadata, target }) : target.type !== 'skill_reference'
      ? await this.files.prepare(scoped, { ...metadata, productVersionId: target.productVersionId, kind: target.type === 'media' ? target.kind : 'experience' })
      : await this.skillFiles.prepare(scoped, domain, target.skillId, metadata);
    const saved = await this.mutations.run(scoped, 'machine.upload.prepare', body.requestId, body, async tx => {
      const credential = await tx.machineCredential.findUniqueOrThrow({ where: { id: access.machineCredentialId! } });
      const createdAt = new Date();
      const expiresAt = new Date(Math.min(createdAt.getTime() + 900_000, credential.expiresAt.getTime(), new Date(file.expiresAt).getTime()));
      await tx.machineUpload.create({ data: { id: file.id, credentialId: credential.id, scope: access.scope,
        target, assetFileId: target.type === 'media' || target.type === 'experience_resource' ? file.id : null, skillFileId: target.type === 'skill_reference' ? file.id : null,
        originalFileId: target.type === 'project_original' ? file.id : null,
        ticketDigest: machineDigest(this.ticket(token, file.id, expiresAt)), createdAt, expiresAt } });
      return { response: { id: file.id }, entityKind: 'machine_upload', entityId: file.id };
    });
    const row = await this.database.client.machineUpload.findUniqueOrThrow({ where: { id: saved.id } });
    return { ...await this.status(access, domain, saved.id), ticket: this.ticket(token, saved.id, row.expiresAt) };
  }
  private async owned(access: CatalogAdminAccess, inputId: unknown, ticket?: string) {
    await this.administrators.require(access);
    const id = parseInput(IdSchema, inputId).toLowerCase();
    const row = await this.database.client.machineUpload.findFirst({ where: { id, credentialId: access.machineCredentialId, scope: access.scope } });
    if (!row) throw new ApiException('NOT_FOUND', '上传不属于当前机器连接', 404);
    if (ticket !== undefined && !/^[A-Za-z0-9_-]{43}$/.test(ticket)) throw machineDenied();
    const target = parseInput(MachineUploadTargetSchema, row.target);
    const scoped = await this.targetAccess(access, target, row.id, ticket === undefined ? undefined : machineDigest(ticket));
    return { row, target, scoped };
  }
  async status(access: CatalogAdminAccess, domain: string, inputId: unknown) {
    const { row, target, scoped } = await this.owned(access, inputId);
    const file = target.type === 'project_original' ? await this.originals.status(scoped, row.originalFileId) : target.type !== 'skill_reference' ? await this.files.status(scoped, row.assetFileId)
      : await this.skillFiles.status(scoped, domain, target.skillId, row.skillFileId);
    return MachineUploadSchema.parse({ uploadId: row.id, fileId: file.status === 'available' ? file.id : null,
      domain, target, status: ['pending', 'verifying', 'uploaded'].includes(file.status) && row.expiresAt <= new Date() ? 'expired' : file.status,
      fileName: file.fileName, mimeType: file.mimeType, byteSize: file.byteSize, checksum: file.checksum,
      expiresAt: row.expiresAt.toISOString(), verifiedAt: file.verifiedAt });
  }
  async upload(access: CatalogAdminAccess, domain: string, id: unknown, ticket: string, request: Request) {
    const { row, target, scoped } = await this.owned(access, id, ticket);
    if (target.type === 'project_original') await this.originals.upload(scoped, row.originalFileId, request);
    else if (target.type !== 'skill_reference') await this.files.upload(scoped, row.assetFileId, request);
    else await this.skillFiles.upload(scoped, domain, target.skillId, row.skillFileId, request);
    return this.status(access, domain, id);
  }
  async complete(access: CatalogAdminAccess, domain: string, id: unknown, ticket: string, input: unknown) {
    const { row, target, scoped } = await this.owned(access, id, ticket);
    if (target.type === 'project_original') await this.originals.complete(scoped, row.originalFileId, input);
    else if (target.type !== 'skill_reference') await this.files.complete(scoped, row.assetFileId, input);
    else await this.skillFiles.complete(scoped, domain, target.skillId, row.skillFileId, input);
    return this.status(access, domain, id);
  }
}
