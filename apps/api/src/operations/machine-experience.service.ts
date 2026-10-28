import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { IdSchema } from '@orai/contracts';
import { ExperienceManifestSchema } from '@orai/contracts/experience';
import { MachineExperienceSaveSchema, ExperienceDraftInputSchema, ExperienceMachineListInputSchema, ExperienceMachineListSchema,
  ExperienceContextInputSchema, ExperienceContextSchema, ExperienceReferenceInputSchema, MachineSkillReferenceSchema,
  ProductConfigurationSchema, CreativeProfileSchema, ProductionPlanModuleSchema, SkillProductPlanInputSchema,
  productCapabilities, registeredExperienceCapabilities, type MachineContentOperation } from '@orai/contracts/admin';
import { CatalogAdminAccessService, type CatalogAdminAccess } from '../catalog/admin-access.service';
import { type MachineRequirement, machineDenied } from '../catalog/machine-authorization';
import { configurationDigest, defaultExperience } from '../catalog/experience-authoring';
import { DatabaseService } from '../database/database.service';
import { ApiException } from '../common/http-errors';
import { parseInput } from '../common/parse-input';
import { profileDto } from './content-projections';
import { ExperienceAuthoringService } from './experience-authoring.service';
import { SkillFilesService } from './skill-files.service';
import { bindSkillProductPlan } from './skill-product-policy';

const identity = z.object({ revisionId: IdSchema }).strict();
function safePaths<T>(value: T): T {
  if (Array.isArray(value)) return value.map(safePaths) as T;
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key,item]) => [key, key === 'downloadPath' ? null : safePaths(item)])) as T;
  return value;
}
@Injectable()
export class MachineExperienceService {
  constructor(private readonly db: DatabaseService, private readonly auth: CatalogAdminAccessService,
    private readonly experiences: ExperienceAuthoringService, private readonly files: SkillFilesService) {}
  private scope(access: CatalogAdminAccess, target: MachineRequirement['target'], permission: MachineRequirement['permission'], extraPermissions: MachineRequirement['extraPermissions'] = []) {
    return this.auth.restrictMachine(access, { target, permission, extraPermissions });
  }
  private async version(access: CatalogAdminAccess, id: string) {
    const row = await this.db.client.productVersion.findFirst({ where: { id, scope: access.scope }, include: { product: true, creativeProfile: true } });
    if (!row) throw machineDenied();
    return row;
  }
  async execute(access: CatalogAdminAccess, operation: MachineContentOperation, input: unknown) {
    switch (operation) {
      case 'list': {
        const body = parseInput(ExperienceMachineListInputSchema,input);
        const scoped = await this.scope(access,{ type:'experience',productVersionId:body.productVersionId },'content:read');
        const v = await this.version(scoped,body.productVersionId);
        const result = await this.experiences.history(scoped,v.productId,v.id,{page:body.page,pageSize:body.pageSize});
        return ExperienceMachineListSchema.parse({ ...result,items:result.items.map(({manifest:_m,methods:_s,reportPlan:_p,...rest})=>rest) });
      }
      case 'get': {
        const body=parseInput(identity,input);
        const scoped=await this.scope(access,{type:'experience',revisionId:body.revisionId},'content:read');
        return safePaths(await this.experiences.read(scoped,body.revisionId));
      }
      case 'draft_save': {
        const body=parseInput(MachineExperienceSaveSchema,input), manifest=body.manifest;
        const scoped=await this.scope(access,{type:'experience',productVersionId:manifest.content.versionId,
          profileId:manifest.creativeProfileRevisionId ?? undefined,methodVersionIds:body.methods.map(m=>m.skillVersionId),fileIds:manifest.resources.map(r=>r.fileId)},
          'content:write',['context:read','skills:read']);
        const v=await this.version(scoped,manifest.content.versionId);
        return safePaths(await this.experiences.save(scoped,v.productId,v.id,{...body,source:'manual'},true));
      }
      case 'experience_validate': {
        const body=parseInput(ExperienceDraftInputSchema,input);
        const scoped=await this.scope(access,{type:'experience',productVersionId:body.manifest.content.versionId,
          profileId:body.manifest.creativeProfileRevisionId ?? undefined,methodVersionIds:body.methods.map(m=>m.skillVersionId),fileIds:body.manifest.resources.map(r=>r.fileId)},
          'content:write',['context:read','skills:read']);
        const v=await this.version(scoped,body.manifest.content.versionId);
        return this.experiences.check(scoped,v.productId,v.id,body);
      }
      case 'context_bundle_get': {
        const body=parseInput(ExperienceContextInputSchema,input);
        const scoped=await this.scope(access,{type:'experience',productVersionId:body.productVersionId,methodVersionIds:body.skillVersionIds},
          'context:read',['content:read',...(body.skillVersionIds.length ? ['skills:read' as const] : [])]);
        return this.db.client.$transaction(async tx=>{
          await this.auth.require(scoped,tx);
          const v=await tx.productVersion.findFirst({where:{id:body.productVersionId,scope:access.scope},include:{product:true,creativeProfile:true}});
          if(!v?.creativeProfile) throw new ApiException('CONFLICT','题库版本需要先固定共同创作设定',409);
          const p=CreativeProfileSchema.parse(v.creativeProfile.profile), config=ProductConfigurationSchema.parse(v.configuration);
          const rows=await tx.styleSkillVersion.findMany({where:{id:{in:body.skillVersionIds},scope:access.scope}});
          const choices=body.skillVersionIds.length ? (['scene_design','report_presentation'] as const).map(purpose=>{
            const found=rows.find(row=>(row.manifest as {purposes:string[]}).purposes.includes(purpose));
            if(!found) throw new ApiException('CONFLICT','需要分别提供场景设计与报告呈现方法',409);
            return {purpose,skillVersionId:found.id,planModuleId:body.planModuleId};
          }):[];
          const methods=await this.experiences.methods(tx,scoped,choices,[],p.experienceForm,
            {productId:v.productId,profileId:v.creativeProfile.id,productPlan:body.productPlan});
          // A supplied plan is authoritative even before methods are selected.
          const fixed = body.productPlan ? await bindSkillProductPlan(tx, scoped, { productId: v.productId, profileId: v.creativeProfile.id,
            reference: body.productPlan, moduleId: body.planModuleId, purpose: 'scene_design', domain: 'experience', form: p.experienceForm }) : undefined;
          const defaultManifest=defaultExperience(v,v.product.themeKey,v.creativeProfile);
          if (fixed) {
            const module = await tx.productionPlanModule.findUniqueOrThrow({ where: { id: fixed.planModuleId } });
            const runtime = ProductionPlanModuleSchema.parse(module.definition).target.runtime;
            if (runtime) {
              if (runtime.inputSchema !== defaultManifest.content.inputSchema || runtime.engine !== defaultManifest.content.engine ||
                runtime.reportSchema !== defaultManifest.report.contentSchema)
                throw new ApiException('VALIDATION_ERROR', '固定商品规划声明的答案、评估或报告协议尚未实现', 400);
              defaultManifest.renderer = runtime.renderer;
              defaultManifest.report.renderer = runtime.reportRenderer;
            }
          }
          const latest=body.includeCapabilities?await tx.experienceAuthoringRevision.findFirst({where:{productVersionId:v.id},orderBy:{number:'desc'}}):null;
          const latestPlan = SkillProductPlanInputSchema.safeParse(latest?.productPlanInput);
          const selectedManifest = latest && (!fixed || latestPlan.success &&
            latestPlan.data.planRevisionId === fixed.planRevisionId && latestPlan.data.planDigest === fixed.planDigest &&
            latestPlan.data.planModuleId === fixed.planModuleId && latestPlan.data.moduleDigest === fixed.moduleDigest &&
            latest.configurationDigest === configurationDigest(v.configuration)) ? ExperienceManifestSchema.parse(latest.manifest) : defaultManifest;
          return ExperienceContextSchema.parse(safePaths({productVersionId:v.id,versionRevision:v.revision,creativeProfile:profileDto(v.creativeProfile),
            defaultManifest,reportPlan:p.reportPlan,
            questions:config.questions.map(({id,text,dimensionId,required,options})=>({id,text,dimensionId,required,options:options.map(({id,label,notApplicable})=>({id,label,notApplicable}))})),
            methods,supported:{renderer:'dom-choice@1',report:'legacy-text@1',resources:['illustration','texture'],
              ...(body.includeTemplates?{templates:registeredExperienceCapabilities(2).map(template=>({renderer:template.renderer,report:template.report,...template.limits}))}:{}),
            },...(body.includeCapabilities?{capabilities:productCapabilities({profile:p,profileRevisionId:v.creativeProfile.id,profileFixed:true,
              manifest:selectedManifest,hasContentVersion:true,capabilityVersion:body.capabilityVersion})}:{}),}));
        });
      }
      case 'references_validate': {
        const body=parseInput(identity,input);
        const scoped=await this.scope(access,{type:'experience',revisionId:body.revisionId},'context:read',['content:read']);
        return this.experiences.checkReferences(scoped,body.revisionId);
      }
      case 'skill_reference_get': {
        const body=parseInput(ExperienceReferenceInputSchema,input);
        const scoped=await this.scope(access,{type:'experience',revisionId:body.revisionId},'context:read',['skills:read','content:read']);
        const draft=await this.experiences.read(scoped,body.revisionId);
        const binding=draft.methods.find(m=>m.purpose===body.purpose), ref=binding?.version.files.find(f=>f.file.id===body.fileId);
        if(!binding||!ref) throw machineDenied();
        if(!['text/plain','text/markdown','application/json'].includes(ref.file.mimeType)||ref.file.byteSize>256*1024)
          throw new ApiException('VALIDATION_ERROR','此工具仅支持 256 KiB 以内的文本参考',400);
        const result=await this.files.content(scoped,'experience',binding.version.skillId,body.fileId),chunks:Buffer[]=[];let length=0;
        for await(const chunk of result.stream){const bytes=Buffer.from(chunk);length+=bytes.length;if(length>256*1024){result.stream.destroy();throw new ApiException('CONFLICT','参考文件超出限制',409);}chunks.push(bytes);}
        const bytes=Buffer.concat(chunks);
        if(bytes.length!==ref.file.byteSize||createHash('sha256').update(bytes).digest('hex')!==ref.file.checksum) throw new ApiException('CONFLICT','参考文件摘要不一致',409);
        let text:string;try{text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{throw new ApiException('VALIDATION_ERROR','参考文件必须为 UTF-8 文本',400);}
        return MachineSkillReferenceSchema.parse({fileId:body.fileId,path:ref.path,mimeType:ref.file.mimeType,checksum:ref.file.checksum,text});
      }
      default: throw machineDenied();
    }
  }
}
