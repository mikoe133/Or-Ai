import 'reflect-metadata';
import {before,after,test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Test} from '@nestjs/testing';
import type {INestApplication} from '@nestjs/common';
import {AppModule} from '../src/app.module';
import {APP_CONFIG} from '../src/config/configuration';
import {CatalogAdminAccessService,type CatalogAdminAccess} from '../src/catalog/admin-access.service';
import {AssetStorage} from '../src/operations/asset-storage';
import {R2AssetStorage} from '../src/operations/r2-asset-storage';
import {FilesService} from '../src/operations/files.service';
import {SkillFilesService} from '../src/operations/skill-files.service';
import {ProjectOriginalFilesService} from '../src/operations/project-original-files.service';
import {DemoIdentityScenarios} from '../scripts/demo-fixtures';
import {createLocalFixture} from './local-fixture';
let fixture:Awaited<ReturnType<typeof createLocalFixture>>,app:INestApplication,directory:string,access:CatalogAdminAccess;
before(async()=>{
  fixture=await createLocalFixture('t09');directory=await mkdtemp(join(tmpdir(),'orai-r2-services-'));
  const configuration={...fixture.configuration,assets:{...fixture.configuration.assets!,driver:'r2',uploadBudget:{ingressBodyBytes:100,requestEnvelopeBytes:0,maxFileBytes:100},uploadTimeoutMs:360000,r2:{accountId:'a'.repeat(32),
    endpoint:'https://'+'a'.repeat(32)+'.r2.cloudflarestorage.com',bucket:'orai-test',accessKeyId:'b'.repeat(32),secretAccessKey:'c'.repeat(64),
    spoolDirectory:directory,spoolMaxBytes:256*1024*1024,spoolMaxFiles:2,requestTimeoutMs:1000}}};
  const module=await Test.createTestingModule({imports:[AppModule]}).overrideProvider(APP_CONFIG).useValue(configuration).compile();
  app=module.createNestApplication({logger:false});await app.init();
  access=await app.get(CatalogAdminAccessService).authorizeLocalOwner(fixture.owner.client,DemoIdentityScenarios.admin.id);
});
after(async()=>{await app?.close();await fixture?.close();if(directory)await rm(directory,{recursive:true,force:true});});
test('the application selects R2 from its configuration without making a provider request at startup',()=>{
  assert.ok(app.get(AssetStorage) instanceof R2AssetStorage);
});
test('R2 media preparation retains administrator scope and normal pending/upload semantics',async()=>{
  const version=await fixture.runtime.client.productVersion.findFirstOrThrow();
  const record=await app.get(FilesService).prepare(access,{productVersionId:version.id,kind:'cover',fileName:'cover.png',mimeType:'image/png',
    byteSize:68,checksum:'1'.repeat(64),requestId:randomUUID()});
  assert.equal(record.status,'pending');assert.equal(record.productVersionId,version.id);assert.equal(record.downloadPath,null);
});
test('R2 Skill reference preparation uses the existing owner, domain, type and quota checks',async()=>{
  const skill=await fixture.runtime.client.styleSkill.create({data:{scope:'DEMO',domain:'copy',slug:'r2-'+randomUUID(),name:'R2参考演示',description:'隔离配置验证',
    styles:['合成'],purposes:['copywriting'],supportedForms:['3d']}});
  const bytes=Buffer.from('Reference');const record=await app.get(SkillFilesService).prepare(access,'copy',skill.id,{fileName:'guide.md',mimeType:'text/markdown',
    byteSize:bytes.length,checksum:createHash('sha256').update(bytes).digest('hex'),requestId:randomUUID()});
  assert.equal(record.status,'pending');assert.equal(record.skillId,skill.id);
});
test('all upload purposes reject bytes above the configured body budget before allocating a pending file',async()=>{
  const version=await fixture.runtime.client.productVersion.findFirstOrThrow();
  const base={fileName:'cover.png',mimeType:'image/png',byteSize:101,checksum:'1'.repeat(64),requestId:randomUUID()};
  await assert.rejects(app.get(FilesService).prepare(access,{...base,productVersionId:version.id,kind:'cover'}),{code:'VALIDATION_ERROR'});
  const skill=await fixture.runtime.client.styleSkill.findFirstOrThrow({where:{domain:'copy'}});
  await assert.rejects(app.get(SkillFilesService).prepare(access,'copy',skill.id,{...base,fileName:'guide.md',mimeType:'text/markdown'}),{code:'VALIDATION_ERROR'});
  await assert.rejects(app.get(ProjectOriginalFilesService).prepare(access,{...base,fileName:'original.zip',mimeType:'application/zip',
    target:{type:'project_original',planModuleId:randomUUID(),outputKey:'bundle',fileKey:'original'}}),{code:'VALIDATION_ERROR'});
});
