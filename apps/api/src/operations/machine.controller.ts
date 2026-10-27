import { Body, Controller, Get, HttpCode, Param, Post, Put, Query, Req, SetMetadata, UseGuards } from '@nestjs/common';
import { CatalogMetadataQuerySchema } from '@orai/contracts';
import { parseInput } from '../common/parse-input';
import { MachineRequestGuard, MACHINE_OPERATION, type MachineRequest } from './machine-request.guard';
import { MachineUploadService } from './machine-upload.service';
import { MachineCredentialsService } from './machine-credentials.service';
import { ProductionRunsService } from './production-runs.service';
import { MachineProjectsService } from './machine-projects.service';
import { MachineContentService } from './machine-content.service';
import { MachineContentOperationSchema, MachineProjectOperationSchema, ProductionRunOperationSchema } from '@orai/contracts/admin';

@Controller('machine/:domain')
@UseGuards(MachineRequestGuard)
export class MachineController {
  constructor(private readonly uploads: MachineUploadService, private readonly credentials: MachineCredentialsService,
    private readonly content: MachineContentService, private readonly projects: MachineProjectsService, private readonly runs: ProductionRunsService) {}
  private async call<T>(r: MachineRequest, operation: string, q: unknown, work: () => Promise<T>) {
    let result: T;
    try { parseInput(CatalogMetadataQuerySchema, q); result = await work(); }
    catch (error) { await this.credentials.record(r.machineToken, r.machineDomain, operation, error, r.params.id, r.body?.requestId); throw error; }
    const entity = result && typeof result === 'object' ? 'uploadId' in result ? result.uploadId : 'id' in result ? result.id : r.params.id : r.params.id;
    await this.credentials.record(r.machineToken, r.machineDomain, operation, undefined, entity, r.body?.requestId);
    return result;
  }
  private ticket(r: MachineRequest) {
    const value = r.headers['x-orai-upload-ticket'];
    return typeof value === 'string' ? value : '';
  }
  @Get('connection') @SetMetadata(MACHINE_OPERATION, 'connection_get')
  connection(@Req() r: MachineRequest, @Query() q: unknown) {
    return this.call(r, 'connection_get', q, () => this.uploads.connection(r.machine));
  }
  @Post('uploads') @HttpCode(200) @SetMetadata(MACHINE_OPERATION, 'upload_prepare')
  prepare(@Req() r: MachineRequest, @Body() b: unknown, @Query() q: unknown) {
    return this.call(r, 'upload_prepare', q, () => this.uploads.prepare(r.machine, r.machineToken, r.machineDomain, b));
  }
  @Get('uploads/:id') @SetMetadata(MACHINE_OPERATION, 'upload_status')
  status(@Req() r: MachineRequest, @Param('id') id: string, @Query() q: unknown) {
    return this.call(r, 'upload_status', q, () => this.uploads.status(r.machine, r.machineDomain, id));
  }
  @Put('uploads/:id/content') @SetMetadata(MACHINE_OPERATION, 'upload_file')
  upload(@Req() r: MachineRequest, @Param('id') id: string, @Query() q: unknown) {
    return this.call(r, 'upload_file', q, () => this.uploads.upload(r.machine, r.machineDomain, id, this.ticket(r), r));
  }
  @Post('uploads/:id/complete') @HttpCode(200) @SetMetadata(MACHINE_OPERATION, 'upload_complete')
  complete(@Req() r: MachineRequest, @Param('id') id: string, @Body() b: unknown, @Query() q: unknown) {
    return this.call(r, 'upload_complete', q, () => this.uploads.complete(r.machine, r.machineDomain, id, this.ticket(r), b));
  }
  @Post('tools/:operation') @HttpCode(200) @SetMetadata(MACHINE_OPERATION, 'content_tool')
  tool(@Req() r: MachineRequest, @Param('operation') operation: string, @Body() b: unknown, @Query() q: unknown) {
    const run = ProductionRunOperationSchema.safeParse(operation);
    const project = MachineProjectOperationSchema.safeParse(operation);
    const parsed = MachineContentOperationSchema.safeParse(operation);
    return this.call(r, run.success ? run.data : project.success ? project.data : parsed.success ? parsed.data : 'unknown', q, () => run.success ? this.runs.execute(r.machine, r.machineToken, run.data, b) : project.success
      ? this.projects.execute(r.machine, project.data, b) : this.content.execute(r.machine, r.machineDomain, operation, b));
  }
}
